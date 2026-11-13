import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  STRENGTH_TYPE_CODE,
  activityFrom,
  againstBaseline,
  dayRanges,
  mergeDailyHealth,
  typeCodeFor,
  type DailyHealth,
  type GarminActivity,
  type GarminHrv,
  type GarminSleep,
  type HealthBaseline,
} from '../../domain/services/garmin';
import {
  GARMIN_CLIENT,
  GarminApiError,
  RITMO_GARMIN_REPOSITORY,
  type GarminClientPort,
  type RitmoGarminRepositoryPort,
} from '../ports/garmin.port';
import { RITMO_SECRET_CIPHER, type SecretCipher } from '../ports/hevy.port';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/** Primera importación: entrenos y salud de estos días hacia atrás. */
const FIRST_IMPORT_DAYS = 180;
/** En cada sincronización se repasan los últimos días: Garmin corrige datos a posteriori. */
const RESYNC_DAYS = 3;
const PAGE = 100;
const MAX_PAGES = 20;
const SLEEP_RANGE_DAYS = 31;
const DEFAULT_WEIGHT_KG = 70;

export interface GarminStatus {
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  importedSessions: number;
  lastError: string | null;
}

export interface GarminSyncResult {
  imported: number;
  updated: number;
  /** Entrenos de fuerza que no se han traído porque ese día ya hay uno de Hevy. */
  skipped: number;
  healthDays: number;
}

function asHttpError(e: unknown): Error {
  if (!(e instanceof GarminApiError)) return e as Error;
  if (e.status === 401 || e.status === 403)
    return new BadRequestException('RITMO_GARMIN_KEY_INVALID');
  if (e.status === 429)
    return new BadGatewayException('RITMO_GARMIN_RATE_LIMIT');
  return new BadGatewayException('RITMO_GARMIN_UNAVAILABLE');
}

const errorCode = (e: unknown) =>
  e instanceof GarminApiError ? `GARMIN_${e.status}` : 'SYNC_FAILED';

@Injectable()
export class GetGarminStatusUseCase {
  constructor(
    @Inject(RITMO_GARMIN_REPOSITORY)
    private readonly repo: RitmoGarminRepositoryPort,
  ) {}

  async execute(userId: string): Promise<GarminStatus> {
    const [conn, importedSessions] = await Promise.all([
      this.repo.getConnection(userId),
      this.repo.countImported(userId),
    ]);
    return {
      connected: !!conn,
      lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
      lastSyncCount: conn?.lastSyncCount ?? null,
      importedSessions,
      lastError: conn?.lastError ?? null,
    };
  }
}

/**
 * Trae de Garmin los entrenos y los datos diarios de salud. La primera vez,
 * los últimos meses; después, desde unos días antes de la última vez. Cada
 * entreno se guarda una sola vez (por su id de Garmin).
 */
@Injectable()
export class SyncGarminUseCase {
  constructor(
    @Inject(RITMO_GARMIN_REPOSITORY)
    private readonly repo: RitmoGarminRepositoryPort,
    @Inject(GARMIN_CLIENT) private readonly client: GarminClientPort,
    @Inject(RITMO_SECRET_CIPHER) private readonly cipher: SecretCipher,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(userId: string, now = new Date()): Promise<GarminSyncResult> {
    const conn = await this.repo.getConnection(userId);
    if (!conn) throw new NotFoundException('RITMO_GARMIN_NOT_CONNECTED');
    try {
      const token = await this.client.accessToken(
        this.cipher.decrypt(conn.apiKeyEnc),
      );
      const profile = await this.profiles.findByUserId(userId);
      const timezone = profile?.timezone ?? 'Europe/Madrid';
      const today = dayInTimezone(now, timezone);
      const from = conn.lastSyncAt
        ? shiftDay(dayInTimezone(conn.lastSyncAt, timezone), -RESYNC_DAYS)
        : shiftDay(today, -FIRST_IMPORT_DAYS);

      const sessions = await this.importActivities(
        userId,
        token,
        from,
        timezone,
      );
      const healthDays = await this.importHealth(userId, token, from, today);
      await this.repo.markSync(userId, {
        lastSyncAt: now,
        lastSyncCount: sessions.imported + sessions.updated,
        lastError: null,
      });
      return { ...sessions, healthDays };
    } catch (e) {
      await this.repo.markSync(userId, { lastError: errorCode(e) });
      throw asHttpError(e);
    }
  }

  private async importActivities(
    userId: string,
    token: string,
    from: string,
    timezone: string,
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    const activities: GarminActivity[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const batch = await this.client.activities(token, {
        startDate: from,
        start: page * PAGE,
        limit: PAGE,
      });
      activities.push(...batch);
      if (batch.length < PAGE) break;
    }
    if (!activities.length) return { imported: 0, updated: 0, skipped: 0 };

    const [weight, hevyDays] = await Promise.all([
      this.body.latestWeightKg(userId),
      this.repo.hevyDays(userId, from),
    ]);
    const types = new Map<string, { id: string; met: number }>();
    const typeFor = async (code: string | null) => {
      const key = code ?? '';
      if (!types.has(key)) {
        const found = code ? await this.repo.typeByCode(code) : null;
        types.set(key, found ?? (await this.repo.ensureOtherType(userId)));
      }
      return types.get(key)!;
    };

    const days = new Set<string>();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    for (const raw of activities) {
      const a = activityFrom(raw);
      if (!a) continue;
      const code = typeCodeFor(raw);
      const loggedOn = dayInTimezone(a.startedAt, timezone);
      // La fuerza con series la trae Hevy; el mismo entreno desde el reloj la duplicaría.
      if (code === STRENGTH_TYPE_CODE && hevyDays.has(loggedOn)) {
        skipped += 1;
        continue;
      }
      const type = await typeFor(code);
      const { externalId, kcal, ...fields } = a;
      const r = await this.repo.upsertImported(userId, externalId, {
        ...fields,
        activityTypeId: type.id,
        loggedOn,
        kcalBurned:
          kcal ??
          sessionKcal({
            met: type.met,
            weightKg: weight ?? DEFAULT_WEIGHT_KG,
            durationSec: a.durationSec,
            effort: null,
          }),
      });
      days.add(loggedOn);
      if (r.previousDay) days.add(r.previousDay);
      if (r.created) imported += 1;
      else updated += 1;
    }
    for (const day of days) await this.refreshDailyLog.execute(userId, day);
    return { imported, updated, skipped };
  }

  private async importHealth(
    userId: string,
    token: string,
    from: string,
    to: string,
  ): Promise<number> {
    const summaries = await this.client.dailySummaries(token, from, to);
    const sleeps: GarminSleep[] = [];
    const hrv: GarminHrv[] = [];
    for (const range of dayRanges(from, to, SLEEP_RANGE_DAYS)) {
      sleeps.push(...(await this.client.sleep(token, range.from, range.to)));
      hrv.push(...(await this.client.hrv(token, range.from, range.to)));
    }
    const days = mergeDailyHealth(summaries, sleeps, hrv);
    await this.repo.upsertDailyHealth(userId, days);
    return days.length;
  }
}

/** Guarda la clave personal (cifrada) tras comprobarla contra Garmin, y hace la primera importación. */
@Injectable()
export class ConnectGarminUseCase {
  constructor(
    @Inject(RITMO_GARMIN_REPOSITORY)
    private readonly repo: RitmoGarminRepositoryPort,
    @Inject(GARMIN_CLIENT) private readonly client: GarminClientPort,
    @Inject(RITMO_SECRET_CIPHER) private readonly cipher: SecretCipher,
    private readonly sync: SyncGarminUseCase,
  ) {}

  async execute(
    userId: string,
    apiKey: string,
    importNow: boolean,
  ): Promise<GarminSyncResult | null> {
    const key = apiKey.trim();
    try {
      await this.client.accessToken(key);
    } catch (e) {
      throw asHttpError(e);
    }
    await this.repo.saveConnection(userId, this.cipher.encrypt(key));
    return importNow ? this.sync.execute(userId) : null;
  }
}

/** Olvida la clave. Los entrenos y datos ya traídos se quedan: son del usuario. */
@Injectable()
export class DisconnectGarminUseCase {
  constructor(
    @Inject(RITMO_GARMIN_REPOSITORY)
    private readonly repo: RitmoGarminRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.repo.deleteConnection(userId);
  }
}

export interface RecentHealth {
  /** Últimos días con algún dato, del más antiguo al más reciente. */
  days: DailyHealth[];
  /** Cada métrica frente a su media de las últimas semanas. */
  sleep: HealthBaseline & { day: string | null };
  hrv: HealthBaseline & { day: string | null };
  restingHr: HealthBaseline & { day: string | null };
}

/** Sueño, variabilidad y pulso en reposo recientes, cada uno frente a su media. */
@Injectable()
export class GetRecentHealthUseCase {
  constructor(
    @Inject(RITMO_GARMIN_REPOSITORY)
    private readonly repo: RitmoGarminRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(userId: string, now = new Date()): Promise<RecentHealth> {
    const profile = await this.profiles.findByUserId(userId);
    const today = dayInTimezone(now, profile?.timezone ?? 'Europe/Madrid');
    const days = await this.repo.dailyHealth(
      userId,
      shiftDay(today, -35),
      today,
    );
    return {
      days: days.slice(-14),
      sleep: againstBaseline(days, (d) => d.sleepSec),
      hrv: againstBaseline(days, (d) => d.hrvMs),
      restingHr: againstBaseline(days, (d) => d.restingHr),
    };
  }
}
