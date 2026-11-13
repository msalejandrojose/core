import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { DailyHealth } from '../../domain/services/garmin';
import type {
  GarminConnection,
  GarminSessionData,
  RitmoGarminRepositoryPort,
} from '../../application/ports/garmin.port';
import { toDateOnly, toDay } from './ritmo.mapper';

const OTHER_TYPE_NAME = 'Otra actividad';

@Injectable()
export class PrismaRitmoGarminRepository implements RitmoGarminRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  getConnection(userId: string): Promise<GarminConnection | null> {
    return this.prisma.ritmoGarminConnection.findUnique({
      where: { userId },
      select: {
        apiKeyEnc: true,
        lastSyncAt: true,
        lastSyncCount: true,
        lastError: true,
      },
    });
  }

  async saveConnection(userId: string, apiKeyEnc: string): Promise<void> {
    await this.prisma.ritmoGarminConnection.upsert({
      where: { userId },
      // Renovar la clave (caduca) no obliga a reimportar: es la misma cuenta.
      update: { apiKeyEnc, lastError: null },
      create: { userId, apiKeyEnc },
    });
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.prisma.ritmoGarminConnection.deleteMany({ where: { userId } });
  }

  async markSync(
    userId: string,
    data: {
      lastSyncAt?: Date;
      lastSyncCount?: number;
      lastError: string | null;
    },
  ): Promise<void> {
    await this.prisma.ritmoGarminConnection.updateMany({
      where: { userId },
      data,
    });
  }

  countImported(userId: string): Promise<number> {
    return this.prisma.ritmoActivitySession.count({
      where: { userId, source: 'GARMIN' },
    });
  }

  async typeByCode(code: string): Promise<{ id: string; met: number } | null> {
    const row = await this.prisma.ritmoActivityType.findUnique({
      where: { code },
      select: { id: true, met: true },
    });
    return row ? { id: row.id, met: Number(row.met) } : null;
  }

  async ensureOtherType(userId: string): Promise<{ id: string; met: number }> {
    const found = await this.prisma.ritmoActivityType.findFirst({
      where: { ownerUserId: userId, name: OTHER_TYPE_NAME },
      select: { id: true, met: true },
    });
    const row =
      found ??
      (await this.prisma.ritmoActivityType.create({
        data: {
          name: OTHER_TYPE_NAME,
          met: 5,
          kind: 'OTHER',
          ownerUserId: userId,
        },
        select: { id: true, met: true },
      }));
    return { id: row.id, met: Number(row.met) };
  }

  async hevyDays(userId: string, from: string): Promise<Set<string>> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: { userId, source: 'HEVY', loggedOn: { gte: toDateOnly(from) } },
      select: { loggedOn: true },
    });
    return new Set(rows.map((r) => toDay(r.loggedOn)));
  }

  async upsertImported(
    userId: string,
    externalId: string,
    data: GarminSessionData,
  ): Promise<{ created: boolean; previousDay: string | null }> {
    const { loggedOn, zoneSeconds, ...session } = data;
    const fields = {
      ...session,
      zoneSeconds: zoneSeconds ?? undefined,
      loggedOn: toDateOnly(loggedOn),
    };
    const existing = await this.prisma.ritmoActivitySession.findUnique({
      where: { source_externalId: { source: 'GARMIN', externalId } },
      select: { id: true, userId: true, loggedOn: true },
    });
    // El id de Garmin es global: si ya lo importó otra cuenta, no se toca.
    if (existing && existing.userId !== userId)
      return { created: false, previousDay: null };
    if (existing) {
      await this.prisma.ritmoActivitySession.update({
        where: { id: existing.id },
        data: fields,
      });
      return { created: false, previousDay: toDay(existing.loggedOn) };
    }
    await this.prisma.ritmoActivitySession.create({
      data: { userId, source: 'GARMIN', externalId, ...fields },
    });
    return { created: true, previousDay: null };
  }

  async upsertDailyHealth(userId: string, days: DailyHealth[]): Promise<void> {
    for (const { day, ...values } of days) {
      // Solo se escriben los datos que llegan: una consulta sin sueño no borra el que ya había.
      const present = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== null),
      );
      await this.prisma.ritmoDailyHealth.upsert({
        where: { userId_day: { userId, day: toDateOnly(day) } },
        update: present,
        create: { userId, day: toDateOnly(day), ...present },
      });
    }
  }

  async dailyHealth(
    userId: string,
    from: string,
    to: string,
  ): Promise<DailyHealth[]> {
    const rows = await this.prisma.ritmoDailyHealth.findMany({
      where: { userId, day: { gte: toDateOnly(from), lte: toDateOnly(to) } },
      orderBy: { day: 'asc' },
    });
    return rows.map((r) => ({
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
    }));
  }
}
