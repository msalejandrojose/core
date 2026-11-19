import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  catalogCodeFor,
  durationSecOf,
  isBodyweightType,
  lowerShare,
  musclesFor,
  routineFrom,
  setsFrom,
  type HevyTemplate,
  type HevyWorkout,
} from '../../domain/services/hevy';
import {
  HEVY_CLIENT,
  HevyApiError,
  BRIO_HEVY_REPOSITORY,
  BRIO_SECRET_CIPHER,
  type HevyClientPort,
  type BrioHevyRepositoryPort,
  type ImportedWorkoutItem,
  type SecretCipher,
} from '../ports/hevy.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import {
  BRIO_ROUTINE_REPOSITORY,
  type BrioRoutineRepositoryPort,
} from '../ports/routine.port';
import { routineForHevyWorkout } from '../../domain/services/routine';
import { parseHevyCsv } from '../../domain/services/hevy-csv';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/** Primera importación: como mucho estos entrenos (10 por página en Hevy). */
const FIRST_IMPORT_PAGES = 30;
const MAX_EVENT_PAGES = 30;
const MAX_TEMPLATE_PAGES = 20;
/** Peso de referencia para estimar kcal si el usuario aún no ha apuntado el suyo. */
const DEFAULT_WEIGHT_KG = 70;
/**
 * Consultas a la vez al importar. La base de datos está en otra región: ir de
 * una en una suma el retardo de cada ida y vuelta (un historial largo pasaba
 * del minuto y la app dejaba de esperar).
 */
const DB_CONCURRENCY = 6;

/** Ejecuta `fn` sobre cada elemento, como mucho `limit` a la vez. */
async function forEachLimited<T>(
  list: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const item = list[next];
      next += 1;
      await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, worker),
  );
}

export interface HevyStatus {
  connected: boolean;
  username: string | null;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  importedSessions: number;
  lastError: string | null;
}

export interface HevySyncResult {
  imported: number;
  updated: number;
  deleted: number;
  /** true si la primera importación se cortó por el tope y quedan entrenos más antiguos. */
  truncated: boolean;
}

/** Traduce un fallo de Hevy a un error que la app pueda explicar. */
export function hevyHttpError(e: unknown): Error {
  if (!(e instanceof HevyApiError)) return e as Error;
  if (e.status === 401 || e.status === 403)
    return new BadRequestException('BRIO_HEVY_KEY_INVALID');
  if (e.status === 429) return new BadGatewayException('BRIO_HEVY_RATE_LIMIT');
  return new BadGatewayException('BRIO_HEVY_UNAVAILABLE');
}

const errorCode = (e: unknown) =>
  e instanceof HevyApiError ? `HEVY_${e.status}` : 'SYNC_FAILED';

async function allTemplates(
  client: HevyClientPort,
  apiKey: string,
): Promise<HevyTemplate[]> {
  const out: HevyTemplate[] = [];
  for (let page = 1; page <= MAX_TEMPLATE_PAGES; page += 1) {
    const r = await client.exerciseTemplates(apiKey, page);
    out.push(...r.items);
    if (page >= r.pageCount) break;
  }
  return out;
}

@Injectable()
export class GetHevyStatusUseCase {
  constructor(
    @Inject(BRIO_HEVY_REPOSITORY)
    private readonly repo: BrioHevyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<HevyStatus> {
    const [conn, importedSessions] = await Promise.all([
      this.repo.getConnection(userId),
      this.repo.countImported(userId),
    ]);
    return {
      connected: !!conn,
      username: conn?.username ?? null,
      lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
      lastSyncCount: conn?.lastSyncCount ?? null,
      importedSessions,
      lastError: conn?.lastError ?? null,
    };
  }
}

/**
 * Trae los entrenos de Hevy. La primera vez recorre el historial (con tope);
 * después solo pide lo cambiado desde la última sincronización, borrados
 * incluidos. Cada entreno se guarda una sola vez (por su id de Hevy).
 */
@Injectable()
export class SyncHevyUseCase {
  constructor(
    @Inject(BRIO_HEVY_REPOSITORY)
    private readonly repo: BrioHevyRepositoryPort,
    @Inject(HEVY_CLIENT) private readonly client: HevyClientPort,
    @Inject(BRIO_SECRET_CIPHER) private readonly cipher: SecretCipher,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly routines: BrioRoutineRepositoryPort,
  ) {}

  async execute(userId: string): Promise<HevySyncResult> {
    const conn = await this.repo.getConnection(userId);
    if (!conn) throw new NotFoundException('BRIO_HEVY_NOT_CONNECTED');
    const apiKey = this.cipher.decrypt(conn.apiKeyEnc);
    const startedAt = new Date();
    try {
      const result = await this.run(userId, apiKey, conn.lastSyncAt);
      await this.repo.markSync(userId, {
        lastSyncAt: startedAt,
        lastSyncCount: result.imported + result.updated,
        lastError: null,
      });
      return result;
    } catch (e) {
      await this.repo.markSync(userId, { lastError: errorCode(e) });
      throw hevyHttpError(e);
    }
  }

  private async run(
    userId: string,
    apiKey: string,
    since: Date | null,
  ): Promise<HevySyncResult> {
    const workouts: HevyWorkout[] = [];
    const deletedIds: string[] = [];
    let truncated = false;

    if (!since) {
      for (let page = 1; page <= FIRST_IMPORT_PAGES; page += 1) {
        const r = await this.client.workouts(apiKey, page);
        workouts.push(...r.items);
        if (page >= r.pageCount) break;
        if (page === FIRST_IMPORT_PAGES) truncated = true;
      }
    } else {
      for (let page = 1; page <= MAX_EVENT_PAGES; page += 1) {
        const r = await this.client.workoutEvents(apiKey, since, page);
        for (const e of r.items) {
          if (e.type === 'updated') workouts.push(e.workout);
          else deletedIds.push(e.id);
        }
        if (page >= r.pageCount) break;
      }
    }

    const days = new Set<string>();
    let deleted = 0;
    for (const id of deletedIds) {
      const day = await this.repo.deleteImported(userId, id);
      if (day) {
        days.add(day);
        deleted += 1;
      }
    }

    const saved = await this.importWorkouts(userId, workouts, () =>
      allTemplates(this.client, apiKey),
    );
    for (const d of saved.days) days.add(d);
    const { imported, updated } = saved;

    await this.refreshDays(userId, days);
    return { imported, updated, deleted, truncated };
  }

  /**
   * Ejercicio de Brío para cada ejercicio de Hevy que aparece en los entrenos:
   * el ya enlazado, el del catálogo si hay equivalente, o uno propio nuevo.
   */

  /**
   * Guarda entrenos de Hevy (de su API o de su CSV) como sesiones de fuerza:
   * uno por id, con sus series y el ejercicio de Brío que corresponda.
   */
  async importWorkouts(
    userId: string,
    workouts: HevyWorkout[],
    loadTemplates: () => Promise<HevyTemplate[]>,
  ): Promise<{ imported: number; updated: number; days: Set<string> }> {
    const days = new Set<string>();
    let imported = 0;
    let updated = 0;
    if (workouts.length) {
      const type = await this.repo.strengthType(userId);
      if (!type) throw new NotFoundException('BRIO_STRENGTH_TYPE_NOT_FOUND');
      const [weight, profile] = await Promise.all([
        this.body.latestWeightKg(userId),
        this.profiles.findByUserId(userId),
      ]);
      const timezone = profile?.timezone ?? 'Europe/Madrid';
      const exerciseIdOf = await this.resolveExercises(
        userId,
        workouts,
        loadTemplates,
      );
      const myRoutines = (await this.routines.list(userId)).filter(
        (r) => r.kind === 'STRENGTH',
      );

      const items: ImportedWorkoutItem[] = [];
      for (const w of workouts) {
        const startedAt = new Date(w.start_time);
        if (Number.isNaN(startedAt.getTime())) continue;
        const durationSec = durationSecOf(w);
        items.push({
          externalId: w.id,
          data: {
            activityTypeId: type.id,
            startedAt,
            loggedOn: dayInTimezone(startedAt, timezone),
            durationSec,
            kcalBurned: sessionKcal({
              met: type.met,
              weightKg: weight ?? DEFAULT_WEIGHT_KG,
              durationSec,
              effort: null,
            }),
            notes:
              [w.title, w.description]
                .filter(Boolean)
                .join(' · ')
                .slice(0, 500) || null,
            sets: setsFrom(w, (id) => exerciseIdOf.get(id)),
          },
          routineId:
            routineForHevyWorkout(myRoutines, {
              routineId: w.routine_id ?? null,
              title: w.title,
            })?.id ?? null,
        });
      }

      const outcomes = await this.repo.upsertImportedMany(userId, items);
      outcomes.forEach((r, i) => {
        // Lo que ya estaba igual no cuenta ni obliga a recalcular su día.
        if (!r.created && !r.changed) return;
        days.add(items[i].data.loggedOn);
        if (r.previousDay) days.add(r.previousDay);
        if (r.created) imported += 1;
        else updated += 1;
      });
    }

    return { imported, updated, days };
  }

  /** Recalcula el resumen de cada día tocado, unos pocos a la vez. */
  private async refreshDays(userId: string, days: Set<string>): Promise<void> {
    await forEachLimited([...days], DB_CONCURRENCY, (day) =>
      this.refreshDailyLog.execute(userId, day),
    );
  }

  private async resolveExercises(
    userId: string,
    workouts: HevyWorkout[],
    loadTemplates: () => Promise<HevyTemplate[]>,
  ): Promise<Map<string, string>> {
    const known = new Map(
      (await this.repo.links(userId)).map((l) => [l.templateId, l.exerciseId]),
    );
    const titles = new Map<string, string>();
    for (const w of workouts)
      for (const ex of w.exercises)
        if (!known.has(ex.exercise_template_id))
          titles.set(ex.exercise_template_id, ex.title);
    if (!titles.size) return known;

    const [catalog, templates] = await Promise.all([
      this.repo.catalog(),
      loadTemplates(),
    ]);
    const byCode = new Map(catalog.map((c) => [c.code, c.id]));
    const codes = new Set(byCode.keys());
    const templateById = new Map(templates.map((t) => [t.id, t]));

    // Varios a la vez, pero los que darían el mismo ejercicio propio (mismo
    // nombre salvo mayúsculas) en fila, para que el segundo encuentre al primero.
    const groups = new Map<string, [string, string][]>();
    for (const entry of titles) {
      const key = entry[1].trim().toLowerCase();
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    await forEachLimited(
      [...groups.values()],
      DB_CONCURRENCY,
      async (group) => {
        for (const [templateId, title] of group) {
          const template = templateById.get(templateId);
          const code = template?.is_custom
            ? null
            : catalogCodeFor(title, codes);
          const exerciseId = code
            ? byCode.get(code)!
            : await this.repo.ensureOwnExercise(userId, {
                name: title,
                isBodyweight: template
                  ? isBodyweightType(template.type)
                  : false,
                muscles: template ? musclesFor(template) : [],
              });
          await this.repo.saveLink(userId, templateId, exerciseId);
          known.set(templateId, exerciseId);
        }
      },
    );
    return known;
  }
}

export interface HevyCsvImportResult {
  imported: number;
  updated: number;
  /** Entrenos que había en el archivo. */
  workouts: number;
  skippedRows: number;
}

/**
 * Importa el CSV que exporta Hevy (gratis, sin Hevy Pro). Va por el mismo
 * camino que la sincronización: mismos ejercicios, series y sesiones, y
 * reimportar el mismo archivo actualiza en vez de duplicar.
 */
@Injectable()
export class ImportHevyCsvUseCase {
  constructor(
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    private readonly sync: SyncHevyUseCase,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(userId: string, csv: string): Promise<HevyCsvImportResult> {
    const profile = await this.profiles.findByUserId(userId);
    let parsed: ReturnType<typeof parseHevyCsv>;
    try {
      parsed = parseHevyCsv(csv, profile?.timezone ?? 'Europe/Madrid');
    } catch {
      throw new BadRequestException('BRIO_HEVY_CSV_INVALID');
    }
    if (!parsed.workouts.length)
      throw new BadRequestException('BRIO_HEVY_CSV_EMPTY');
    const saved = await this.sync.importWorkouts(userId, parsed.workouts, () =>
      Promise.resolve([]),
    );
    await forEachLimited([...saved.days], DB_CONCURRENCY, (day) =>
      this.refreshDailyLog.execute(userId, day),
    );
    return {
      imported: saved.imported,
      updated: saved.updated,
      workouts: parsed.workouts.length,
      skippedRows: parsed.skippedRows,
    };
  }
}

/** Guarda la clave (cifrada) tras comprobarla contra Hevy, y hace la primera importación. */
@Injectable()
export class ConnectHevyUseCase {
  constructor(
    @Inject(BRIO_HEVY_REPOSITORY)
    private readonly repo: BrioHevyRepositoryPort,
    @Inject(HEVY_CLIENT) private readonly client: HevyClientPort,
    @Inject(BRIO_SECRET_CIPHER) private readonly cipher: SecretCipher,
    private readonly sync: SyncHevyUseCase,
  ) {}

  async execute(
    userId: string,
    apiKey: string,
    importNow: boolean,
  ): Promise<HevySyncResult | null> {
    const key = apiKey.trim();
    let username: string;
    try {
      username = (await this.client.userInfo(key)).username;
    } catch (e) {
      throw hevyHttpError(e);
    }
    await this.repo.saveConnection(userId, {
      apiKeyEnc: this.cipher.encrypt(key),
      username: username || null,
    });
    return importNow ? this.sync.execute(userId) : null;
  }
}

/** Olvida la clave. Los entrenos ya importados se quedan: son del usuario. */
@Injectable()
export class DisconnectHevyUseCase {
  constructor(
    @Inject(BRIO_HEVY_REPOSITORY)
    private readonly repo: BrioHevyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.repo.deleteConnection(userId);
  }
}

export interface SentRoutine {
  routineId: string | null;
  title: string;
  exercises: number;
  /** Ejercicios que no existen en Hevy y se han quedado fuera. */
  skipped: string[];
  basedOnSessionId: string;
  basedOnDay: string;
}

/**
 * Crea en Hevy la rutina de una sesión de fuerza planificada. Como el plan no
 * guarda ejercicios, se copian los del último entreno equivalente: de pierna
 * para «Fuerza · pierna», de torso para «Fuerza · tren superior», o el último
 * de fuerza para el resto.
 */
@Injectable()
export class SendPlannedRoutineToHevyUseCase {
  constructor(
    @Inject(BRIO_HEVY_REPOSITORY)
    private readonly repo: BrioHevyRepositoryPort,
    @Inject(HEVY_CLIENT) private readonly client: HevyClientPort,
    @Inject(BRIO_SECRET_CIPHER) private readonly cipher: SecretCipher,
  ) {}

  async execute(userId: string, day: string): Promise<SentRoutine> {
    const conn = await this.repo.getConnection(userId);
    if (!conn) throw new NotFoundException('BRIO_HEVY_NOT_CONNECTED');
    const planned = await this.repo.getPlanned(userId, day);
    if (!planned) throw new NotFoundException('BRIO_PLANNED_SESSION_NOT_FOUND');
    if (planned.kind !== 'STRENGTH')
      throw new BadRequestException('BRIO_HEVY_NOT_STRENGTH');

    const sessions = await this.repo.recentStrengthSessions(userId, 20);
    const wantsLower =
      planned.templateCode === 'fpie'
        ? true
        : planned.templateCode === 'fsup'
          ? false
          : null;
    const source =
      wantsLower === null
        ? sessions[0]
        : (sessions.find((s) => lowerShare(s.sets) >= 0.5 === wantsLower) ??
          sessions[0]);
    if (!source) throw new BadRequestException('BRIO_HEVY_NO_SOURCE_SESSION');

    const apiKey = this.cipher.decrypt(conn.apiKeyEnc);
    try {
      const templateOf = await hevyTemplatesFor(
        this.repo,
        this.client,
        userId,
        apiKey,
        source.sets,
      );
      const { exercises, skipped } = routineFrom(source.sets, (id) =>
        templateOf.get(id),
      );
      if (!exercises.length)
        throw new BadRequestException('BRIO_HEVY_NO_MATCHING_EXERCISES');
      const created = await this.client.createRoutine(apiKey, {
        title: planned.title,
        notes: 'Enviada desde Brío',
        exercises,
      });
      await this.repo.savePlannedStructure(userId, day, {
        ...(planned.structure ?? {}),
        hevyRoutineId: created.id,
        hevySentAt: new Date().toISOString(),
      });
      return {
        routineId: created.id,
        title: planned.title,
        exercises: exercises.length,
        skipped,
        basedOnSessionId: source.id,
        basedOnDay: source.day,
      };
    } catch (e) {
      throw hevyHttpError(e);
    }
  }
}

/**
 * Ejercicio de Hevy para cada ejercicio de Brío: el enlazado al importar o,
 * para los apuntados en Brío, el equivalente del catálogo de Hevy (se guarda
 * el enlace para la próxima vez).
 */
export async function hevyTemplatesFor(
  repo: BrioHevyRepositoryPort,
  client: HevyClientPort,
  userId: string,
  apiKey: string,
  items: { exerciseId: string; exerciseCode: string | null }[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const l of await repo.links(userId))
    if (!out.has(l.exerciseId)) out.set(l.exerciseId, l.templateId);

  const pending = new Map<string, string>();
  for (const s of items)
    if (!out.has(s.exerciseId) && s.exerciseCode)
      pending.set(s.exerciseId, s.exerciseCode);
  if (!pending.size) return out;

  const codes = new Set(pending.values());
  const templates = await allTemplates(client, apiKey);
  for (const [exerciseId, code] of pending) {
    const match = templates.find(
      (t) => !t.is_custom && catalogCodeFor(t.title, codes) === code,
    );
    if (!match) continue;
    await repo.saveLink(userId, match.id, exerciseId);
    out.set(exerciseId, match.id);
  }
  return out;
}
