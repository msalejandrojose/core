import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { DailyHealth } from '../../domain/services/garmin';
import type { DevicePlatform } from '../../domain/services/device-health';
import type {
  BrioDeviceHealthRepositoryPort,
  DeviceSessionData,
  ExistingSession,
  HealthDeviceState,
} from '../../application/ports/device-health.port';
import { toDateOnly, toDay } from './brio.mapper';

const SOURCE = {
  ios: 'HEALTHKIT',
  android: 'HEALTH_CONNECT',
} as const satisfies Record<DevicePlatform, string>;

const DEVICE_SOURCES = [SOURCE.ios, SOURCE.android];

const platformOf = (source: string): DevicePlatform =>
  source === SOURCE.android ? 'android' : 'ios';

@Injectable()
export class PrismaBrioDeviceHealthRepository implements BrioDeviceHealthRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getDevice(userId: string): Promise<HealthDeviceState | null> {
    const row = await this.prisma.brioHealthDevice.findUnique({
      where: { userId },
    });
    return row
      ? {
          platform: platformOf(row.source),
          lastSyncAt: row.lastSyncAt,
          lastSyncDays: row.lastSyncDays,
          lastSyncWorkouts: row.lastSyncWorkouts,
        }
      : null;
  }

  async saveSync(
    userId: string,
    platform: DevicePlatform,
    data: { lastSyncAt: Date; lastSyncDays: number; lastSyncWorkouts: number },
  ): Promise<void> {
    const values = { source: SOURCE[platform], ...data };
    await this.prisma.brioHealthDevice.upsert({
      where: { userId },
      update: values,
      create: { userId, ...values },
    });
  }

  async deleteDevice(userId: string): Promise<void> {
    await this.prisma.brioHealthDevice.deleteMany({ where: { userId } });
  }

  async hasGarmin(userId: string): Promise<boolean> {
    return (
      (await this.prisma.brioGarminConnection.count({ where: { userId } })) > 0
    );
  }

  async healthDays(
    userId: string,
    days: string[],
  ): Promise<Map<string, DailyHealth & { fromGarmin: boolean }>> {
    if (!days.length) return new Map();
    const rows = await this.prisma.brioDailyHealth.findMany({
      where: { userId, day: { in: days.map(toDateOnly) } },
    });
    return new Map(
      rows.map((r) => [
        toDay(r.day),
        {
          day: toDay(r.day),
          restingHr: r.restingHr,
          steps: r.steps,
          sleepSec: r.sleepSec,
          deepSleepSec: r.deepSleepSec,
          remSleepSec: r.remSleepSec,
          awakeSec: r.awakeSec,
          sleepScore: r.sleepScore,
          hrvMs: r.hrvMs,
          stressAvg: r.stressAvg,
          bodyBatteryMax: r.bodyBatteryMax,
          fromGarmin: r.source === 'GARMIN',
        },
      ]),
    );
  }

  async saveHealthDay(
    userId: string,
    platform: DevicePlatform,
    day: string,
    values: Partial<DailyHealth>,
  ): Promise<void> {
    const where = { userId_day: { userId, day: toDateOnly(day) } };
    const existing = await this.prisma.brioDailyHealth.findUnique({
      where,
      select: { source: true },
    });
    // Un día que ya trajo Garmin sigue siendo de Garmin aunque el móvil rellene huecos.
    const source = existing?.source === 'GARMIN' ? 'GARMIN' : SOURCE[platform];
    await this.prisma.brioDailyHealth.upsert({
      where,
      update: { ...values, source },
      create: { userId, day: toDateOnly(day), ...values, source },
    });
  }

  async sessionsBetween(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<ExistingSession[]> {
    const rows = await this.prisma.brioActivitySession.findMany({
      where: { userId, startedAt: { gte: from, lte: to } },
      select: {
        externalId: true,
        source: true,
        startedAt: true,
        durationSec: true,
      },
    });
    return rows.map((r) => ({
      externalId: r.externalId,
      fromDevice: (DEVICE_SOURCES as string[]).includes(r.source),
      startedAt: r.startedAt,
      durationSec: r.durationSec,
    }));
  }

  async upsertSession(
    userId: string,
    platform: DevicePlatform,
    externalId: string,
    data: DeviceSessionData,
  ): Promise<{ created: boolean; previousDay: string | null }> {
    const source = SOURCE[platform];
    const { loggedOn, ...session } = data;
    const fields = { ...session, loggedOn: toDateOnly(loggedOn) };
    const existing = await this.prisma.brioActivitySession.findUnique({
      where: { source_externalId: { source, externalId } },
      select: { id: true, userId: true, loggedOn: true },
    });
    if (existing && existing.userId !== userId)
      return { created: false, previousDay: null };
    if (existing) {
      await this.prisma.brioActivitySession.update({
        where: { id: existing.id },
        data: fields,
      });
      return { created: false, previousDay: toDay(existing.loggedOn) };
    }
    await this.prisma.brioActivitySession.create({
      data: { userId, source, externalId, ...fields },
    });
    return { created: true, previousDay: null };
  }

  async weighedDays(
    userId: string,
    from: string,
    to: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.brioBodyMeasurement.findMany({
      where: {
        userId,
        measuredOn: { gte: toDateOnly(from), lte: toDateOnly(to) },
      },
      select: { measuredOn: true },
    });
    return new Set(rows.map((r) => toDay(r.measuredOn)));
  }
}
