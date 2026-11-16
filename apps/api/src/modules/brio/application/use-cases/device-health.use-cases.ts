import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import { STRENGTH_TYPE_CODE } from '../../domain/services/garmin';
import {
  deviceDayFrom,
  deviceWeight,
  deviceWorkoutFrom,
  isFromGarmin,
  mergeDeviceDay,
  overlaps,
  type DeviceDayInput,
  type DevicePlatform,
  type DeviceWorkout,
  type DeviceWorkoutInput,
} from '../../domain/services/device-health';
import {
  BRIO_DEVICE_HEALTH_REPOSITORY,
  type BrioDeviceHealthRepositoryPort,
} from '../ports/device-health.port';
import {
  BRIO_GARMIN_REPOSITORY,
  type BrioGarminRepositoryPort,
} from '../ports/garmin.port';
import {
  BRIO_CONNECTION_PREFS,
  type ConnectionPrefsPort,
} from '../ports/connection-prefs.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import { LogWeightUseCase } from './log-weight.use-case';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

const DEFAULT_WEIGHT_KG = 70;

export interface HealthDeviceStatus {
  connected: boolean;
  platform: DevicePlatform | null;
  lastSyncAt: string | null;
  lastSyncDays: number | null;
  lastSyncWorkouts: number | null;
}

export interface DeviceHealthImport {
  platform: DevicePlatform;
  days: DeviceDayInput[];
  workouts: DeviceWorkoutInput[];
}

export interface DeviceHealthResult {
  healthDays: number;
  weights: number;
  imported: number;
  updated: number;
  /** Entrenos que ya estaban por otra vía (Garmin, Hevy, a mano) y no se han duplicado. */
  skipped: number;
}

@Injectable()
export class GetHealthDeviceStatusUseCase {
  constructor(
    @Inject(BRIO_DEVICE_HEALTH_REPOSITORY)
    private readonly repo: BrioDeviceHealthRepositoryPort,
  ) {}

  async execute(userId: string): Promise<HealthDeviceStatus> {
    const d = await this.repo.getDevice(userId);
    return {
      connected: !!d,
      platform: d?.platform ?? null,
      lastSyncAt: d?.lastSyncAt?.toISOString() ?? null,
      lastSyncDays: d?.lastSyncDays ?? null,
      lastSyncWorkouts: d?.lastSyncWorkouts ?? null,
    };
  }
}

/** Olvida la conexión; lo ya traído se queda (como al desconectar Garmin). */
@Injectable()
export class DisconnectHealthDeviceUseCase {
  constructor(
    @Inject(BRIO_DEVICE_HEALTH_REPOSITORY)
    private readonly repo: BrioDeviceHealthRepositoryPort,
  ) {}

  execute(userId: string): Promise<void> {
    return this.repo.deleteDevice(userId);
  }
}

/**
 * Guarda lo que el móvil ha leído de Apple Salud / Health Connect: salud por
 * día, peso y entrenos. No duplica lo que ya trae otra fuente: Garmin manda en
 * los días que ya tiene, el peso apuntado no se pisa y un entreno que se solapa
 * con otro ya guardado (Garmin, Hevy, a mano) se salta.
 */
@Injectable()
export class ImportDeviceHealthUseCase {
  constructor(
    @Inject(BRIO_DEVICE_HEALTH_REPOSITORY)
    private readonly repo: BrioDeviceHealthRepositoryPort,
    @Inject(BRIO_GARMIN_REPOSITORY)
    private readonly types: BrioGarminRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    @Inject(BRIO_CONNECTION_PREFS)
    private readonly prefs: ConnectionPrefsPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
    private readonly logWeight: LogWeightUseCase,
  ) {}

  async execute(
    userId: string,
    input: DeviceHealthImport,
    now = new Date(),
  ): Promise<DeviceHealthResult> {
    const prefs = await this.prefs.get(userId);
    const profile = await this.profiles.findByUserId(userId);
    const timezone = profile?.timezone ?? 'Europe/Madrid';

    let healthDays = 0;
    let weights = 0;
    if (prefs.importHealth) {
      healthDays = await this.importDays(userId, input.platform, input.days);
      weights = await this.importWeights(userId, input.days);
    }
    const sessions = prefs.importActivities
      ? await this.importWorkouts(
          userId,
          input.platform,
          input.workouts,
          timezone,
        )
      : { imported: 0, updated: 0, skipped: 0 };

    await this.repo.saveSync(userId, input.platform, {
      lastSyncAt: now,
      lastSyncDays: healthDays,
      lastSyncWorkouts: sessions.imported + sessions.updated,
    });
    return { healthDays, weights, ...sessions };
  }

  private async importDays(
    userId: string,
    platform: DevicePlatform,
    raw: DeviceDayInput[],
  ): Promise<number> {
    const days = raw.map(deviceDayFrom).filter((d) => d !== null);
    const existing = await this.repo.healthDays(
      userId,
      days.map((d) => d.day),
    );
    let saved = 0;
    for (const d of days) {
      const values = mergeDeviceDay(d, existing.get(d.day) ?? null);
      if (!Object.keys(values).length) continue;
      await this.repo.saveHealthDay(userId, platform, d.day, values);
      saved += 1;
    }
    return saved;
  }

  private async importWeights(
    userId: string,
    raw: DeviceDayInput[],
  ): Promise<number> {
    const withWeight = raw
      .map((d) => ({ day: d.day, kg: deviceWeight(d) }))
      .filter((d): d is { day: string; kg: number } => d.kg !== null)
      .filter((d) => deviceDayFrom({ day: d.day }) !== null)
      .sort((a, b) => a.day.localeCompare(b.day));
    if (!withWeight.length) return 0;
    const weighed = await this.repo.weighedDays(
      userId,
      withWeight[0].day,
      withWeight[withWeight.length - 1].day,
    );
    let saved = 0;
    for (const w of withWeight) {
      if (weighed.has(w.day)) continue;
      // Como una pesada a mano: recalcula objetivos y refresca el día.
      await this.logWeight.execute({
        userId,
        measuredOn: w.day,
        weightKg: w.kg,
        bodyFatPct: null,
        waistCm: null,
        notes: null,
      });
      saved += 1;
    }
    return saved;
  }

  private async importWorkouts(
    userId: string,
    platform: DevicePlatform,
    raw: DeviceWorkoutInput[],
    timezone: string,
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    const workouts = raw
      .map(deviceWorkoutFrom)
      .filter((w): w is DeviceWorkout => w !== null);
    if (!workouts.length) return { imported: 0, updated: 0, skipped: 0 };

    const starts = workouts.map((w) => w.startedAt.getTime());
    const from = new Date(Math.min(...starts) - 24 * 3600 * 1000);
    const to = new Date(Math.max(...starts) + 24 * 3600 * 1000);
    const [others, hasGarmin, weight, hevyDays] = await Promise.all([
      this.repo.sessionsBetween(userId, from, to),
      this.repo.hasGarmin(userId),
      this.body.latestWeightKg(userId),
      this.types.hevyDays(userId, dayInTimezone(from, timezone)),
    ]);
    // Las sesiones que ya trajo el propio móvil se actualizan, no cuentan como duplicado.
    const mine = new Set(
      others.filter((o) => o.fromDevice).map((o) => o.externalId),
    );
    const foreign = others.filter((o) => !o.fromDevice);

    const types = new Map<string, { id: string; met: number }>();
    const typeFor = async (code: string | null) => {
      const key = code ?? '';
      if (!types.has(key)) {
        const found = code ? await this.types.typeByCode(code) : null;
        types.set(key, found ?? (await this.types.ensureOtherType(userId)));
      }
      return types.get(key)!;
    };

    const days = new Set<string>();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    for (const w of workouts) {
      const loggedOn = dayInTimezone(w.startedAt, timezone);
      const duplicate =
        !mine.has(w.externalId) &&
        ((hasGarmin && isFromGarmin(w)) ||
          (w.typeCode === STRENGTH_TYPE_CODE && hevyDays.has(loggedOn)) ||
          foreign.some((o) => overlaps(o, w)));
      if (duplicate) {
        skipped += 1;
        continue;
      }
      const type = await typeFor(w.typeCode);
      const r = await this.repo.upsertSession(userId, platform, w.externalId, {
        activityTypeId: type.id,
        startedAt: w.startedAt,
        loggedOn,
        durationSec: w.durationSec,
        distanceM: w.distanceM,
        kcalBurned:
          w.kcal ??
          sessionKcal({
            met: type.met,
            weightKg: weight ?? DEFAULT_WEIGHT_KG,
            durationSec: w.durationSec,
            effort: null,
          }),
        notes: w.sourceName ? `Desde ${w.sourceName}` : null,
      });
      days.add(loggedOn);
      if (r.previousDay) days.add(r.previousDay);
      if (r.created) imported += 1;
      else updated += 1;
    }
    for (const day of days) await this.refreshDailyLog.execute(userId, day);
    return { imported, updated, skipped };
  }
}
