import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  catalogCodeFor,
  durationSecOf,
  setsFrom,
} from '../../domain/services/hevy';
import {
  HevyCsvFormatError,
  MAX_CSV_BYTES,
  workoutsFromHevyCsv,
} from '../../domain/services/hevy-csv';
import { templateExercisesFrom } from '../../domain/services/workout-template';
import {
  RITMO_HEVY_REPOSITORY,
  type RitmoHevyRepositoryPort,
} from '../ports/hevy.port';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';
import {
  RITMO_WORKOUT_TEMPLATES,
  type WorkoutTemplatePort,
} from '../ports/workout-template.port';
import { CSV_EXTERNAL_PREFIX, sameWorkoutStart } from './hevy.use-cases';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/** Peso de referencia para estimar kcal si el usuario aún no ha apuntado el suyo. */
const DEFAULT_WEIGHT_KG = 70;

export interface HevyCsvImportResult {
  /** Entrenos nuevos y entrenos que ya estaban (de un CSV anterior) y se han actualizado. */
  imported: number;
  updated: number;
  /** Entrenos que ya habían llegado por la conexión con Hevy: no se duplican. */
  alreadySynced: number;
  /** Primer y último día importados. */
  firstDay: string | null;
  lastDay: string | null;
  /** Ejercicios del archivo que han encajado con el catálogo. */
  matchedExercises: number;
  /** Ejercicios sin equivalente: se han creado como propios. */
  createdExercises: string[];
  /** Plantillas nuevas, una por cada tipo de entreno (su título). */
  createdTemplates: string[];
  /** Series de solo tiempo o distancia (plancha, estiramientos), que no se importan. */
  timeOnlySets: number;
  /** Filas que no se han podido leer. */
  badRows: number;
}

/**
 * Importa el CSV que exporta Hevy: crea los entrenos de fuerza (sin duplicar
 * si se vuelve a subir el mismo archivo o si ya llegaron por la conexión con
 * Hevy), enlaza cada ejercicio con el del catálogo o crea uno propio, y deja
 * una plantilla por cada tipo de entreno con los ejercicios de la última vez.
 */
@Injectable()
export class ImportHevyCsvUseCase {
  constructor(
    @Inject(RITMO_HEVY_REPOSITORY)
    private readonly repo: RitmoHevyRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    @Inject(RITMO_WORKOUT_TEMPLATES)
    private readonly templates: WorkoutTemplatePort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(
    userId: string,
    csv: Buffer | string,
  ): Promise<HevyCsvImportResult> {
    const text = typeof csv === 'string' ? csv : csv.toString('utf8');
    if (!text.trim() || Buffer.byteLength(text) > MAX_CSV_BYTES)
      throw new BadRequestException('RITMO_HEVY_CSV_INVALID');

    const [profile, weight, type] = await Promise.all([
      this.profiles.findByUserId(userId),
      this.body.latestWeightKg(userId),
      this.repo.strengthType(userId),
    ]);
    if (!type) throw new BadRequestException('RITMO_STRENGTH_TYPE_NOT_FOUND');
    const timezone = profile?.timezone ?? 'Europe/Madrid';

    let parsed;
    try {
      parsed = workoutsFromHevyCsv(text, timezone);
    } catch (e) {
      if (e instanceof HevyCsvFormatError)
        throw new BadRequestException('RITMO_HEVY_CSV_INVALID');
      throw e;
    }
    if (!parsed.workouts.length)
      throw new BadRequestException('RITMO_HEVY_CSV_EMPTY');

    // Ejercicios: el del catálogo si hay equivalente; si no, uno propio.
    const catalog = await this.repo.catalog();
    const byCode = new Map(catalog.map((c) => [c.code, c.id]));
    const codes = new Set(byCode.keys());
    const exerciseIdOf = new Map<string, string>();
    const createdExercises: string[] = [];
    let matchedExercises = 0;
    for (const [key, title] of parsed.exerciseTitles) {
      const used = parsed.workouts.some((w) =>
        w.exercises.some((e) => e.exercise_template_id === key),
      );
      if (!used) continue;
      const code = catalogCodeFor(title, codes);
      if (code) {
        exerciseIdOf.set(key, byCode.get(code)!);
        matchedExercises += 1;
        continue;
      }
      const bodyweight = parsed.workouts.every((w) =>
        w.exercises
          .filter((e) => e.exercise_template_id === key)
          .every((e) => e.sets.every((s) => !s.weight_kg)),
      );
      exerciseIdOf.set(
        key,
        await this.repo.ensureOwnExercise(userId, {
          name: title,
          isBodyweight: bodyweight,
          muscles: [],
        }),
      );
      createdExercises.push(title);
    }

    const synced = (await this.repo.importedStarts(userId)).filter(
      (s) => !s.externalId.startsWith(CSV_EXTERNAL_PREFIX),
    );
    const days = new Set<string>();
    let imported = 0;
    let updated = 0;
    let alreadySynced = 0;
    /** Series del último entreno de cada título, para su plantilla. */
    const latestByTitle = new Map<string, ReturnType<typeof setsFrom>>();

    for (const w of parsed.workouts) {
      const startedAt = new Date(w.start_time);
      const sets = setsFrom(w, (key) => exerciseIdOf.get(key));
      if (!sets.length) continue;
      latestByTitle.set(w.title, sets);
      if (synced.some((s) => sameWorkoutStart(s.startedAt, startedAt))) {
        alreadySynced += 1;
        continue;
      }
      const durationSec = durationSecOf(w);
      const loggedOn = dayInTimezone(startedAt, timezone);
      const r = await this.repo.upsertImported(
        userId,
        `${CSV_EXTERNAL_PREFIX}${userId}:${w.start_time}`,
        {
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
          sets,
        },
      );
      days.add(loggedOn);
      if (r.previousDay) days.add(r.previousDay);
      if (r.created) imported += 1;
      else updated += 1;
    }

    // Una plantilla por tipo de entreno, si aún no hay una con ese nombre: no
    // se pisan las que el usuario ya tenga (o haya retocado).
    const existing = new Set(
      (await this.templates.list(userId)).map((t) => t.name),
    );
    const createdTemplates: string[] = [];
    for (const [title, sets] of latestByTitle) {
      const name = title.slice(0, 120);
      if (existing.has(name)) continue;
      const exercises = templateExercisesFrom(sets);
      if (!exercises.length) continue;
      await this.templates.upsertByName(userId, { name, exercises });
      createdTemplates.push(name);
    }

    const sortedDays = [...days].sort();
    for (const day of sortedDays)
      await this.refreshDailyLog.execute(userId, day);

    return {
      imported,
      updated,
      alreadySynced,
      firstDay: sortedDays[0] ?? null,
      lastDay: sortedDays[sortedDays.length - 1] ?? null,
      matchedExercises,
      createdExercises,
      createdTemplates,
      timeOnlySets: parsed.timeOnlySets,
      badRows: parsed.badRows,
    };
  }
}
