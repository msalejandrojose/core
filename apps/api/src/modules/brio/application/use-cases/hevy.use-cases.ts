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
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/** Primera importación: como mucho estos entrenos (10 por página en Hevy). */
const FIRST_IMPORT_PAGES = 30;
const MAX_EVENT_PAGES = 30;
const MAX_TEMPLATE_PAGES = 20;
/** Peso de referencia para estimar kcal si el usuario aún no ha apuntado el suyo. */
const DEFAULT_WEIGHT_KG = 70;

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
function asHttpError(e: unknown): Error {
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
      throw asHttpError(e);
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
        apiKey,
        workouts,
      );

      for (const w of workouts) {
        const startedAt = new Date(w.start_time);
        if (Number.isNaN(startedAt.getTime())) continue;
        const durationSec = durationSecOf(w);
        const loggedOn = dayInTimezone(startedAt, timezone);
        const r = await this.repo.upsertImported(userId, w.id, {
          activityTypeId: type.id,
          startedAt,
          loggedOn,
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
        });
        days.add(loggedOn);
        if (r.previousDay) days.add(r.previousDay);
        if (r.created) imported += 1;
        else updated += 1;
      }
    }

    for (const day of days) await this.refreshDailyLog.execute(userId, day);
    return { imported, updated, deleted, truncated };
  }

  /**
   * Ejercicio de Brío para cada ejercicio de Hevy que aparece en los entrenos:
   * el ya enlazado, el del catálogo si hay equivalente, o uno propio nuevo.
   */
  private async resolveExercises(
    userId: string,
    apiKey: string,
    workouts: HevyWorkout[],
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
      allTemplates(this.client, apiKey),
    ]);
    const byCode = new Map(catalog.map((c) => [c.code, c.id]));
    const codes = new Set(byCode.keys());
    const templateById = new Map(templates.map((t) => [t.id, t]));

    for (const [templateId, title] of titles) {
      const template = templateById.get(templateId);
      const code = template?.is_custom ? null : catalogCodeFor(title, codes);
      const exerciseId = code
        ? byCode.get(code)!
        : await this.repo.ensureOwnExercise(userId, {
            name: title,
            isBodyweight: template ? isBodyweightType(template.type) : false,
            muscles: template ? musclesFor(template) : [],
          });
      await this.repo.saveLink(userId, templateId, exerciseId);
      known.set(templateId, exerciseId);
    }
    return known;
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
      throw asHttpError(e);
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
      const templateOf = await this.templatesFor(userId, apiKey, source.sets);
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
      throw asHttpError(e);
    }
  }

  /**
   * Ejercicio de Hevy para cada ejercicio de Brío del entreno: el enlazado al
   * importar o, para los apuntados a mano en Brío, el equivalente del catálogo.
   */
  private async templatesFor(
    userId: string,
    apiKey: string,
    sets: { exerciseId: string; exerciseCode: string | null }[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const l of await this.repo.links(userId))
      if (!out.has(l.exerciseId)) out.set(l.exerciseId, l.templateId);

    const pending = new Map<string, string>();
    for (const s of sets)
      if (!out.has(s.exerciseId) && s.exerciseCode)
        pending.set(s.exerciseId, s.exerciseCode);
    if (!pending.size) return out;

    const codes = new Set(pending.values());
    const templates = await allTemplates(this.client, apiKey);
    for (const [exerciseId, code] of pending) {
      const match = templates.find(
        (t) => !t.is_custom && catalogCodeFor(t.title, codes) === code,
      );
      if (!match) continue;
      await this.repo.saveLink(userId, match.id, exerciseId);
      out.set(exerciseId, match.id);
    }
    return out;
  }
}
