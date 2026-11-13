import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { ActivityKind } from '../../domain/entities/performance.entity';
import type {
  ActualSession,
  Plan,
  PlanLoad,
  PlannedSession,
} from '../../domain/entities/plan.entity';
import type {
  CompletionData,
  PlannedSessionData,
  RitmoPlanRepositoryPort,
  SavePlanData,
} from '../../application/ports/ritmo-plan-repository.port';
import { toDateOnly, toDay } from './ritmo.mapper';

interface PlanRow {
  id: string;
  name: string;
  raceDate: Date | null;
  raceDistanceM: number | null;
  targetTimeSec: number | null;
  notes: string | null;
  isActive: boolean;
}

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    raceDate: row.raceDate ? toDay(row.raceDate) : null,
    raceDistanceM: row.raceDistanceM,
    targetTimeSec: row.targetTimeSec,
    notes: row.notes,
    isActive: row.isActive,
  };
}

interface PlannedRow {
  id: string;
  planId: string | null;
  day: Date;
  kind: string;
  templateCode: string | null;
  title: string;
  load: string;
  startTime: string | null;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  targetPaceSecPerKm: number | null;
  structure: unknown;
  notes: string | null;
  completedAt: Date | null;
  completedSessionId: string | null;
  actualNotes: string | null;
  skipped: boolean;
}

function toPlanned(row: PlannedRow): PlannedSession {
  const structure = row.structure;
  return {
    id: row.id,
    planId: row.planId,
    day: toDay(row.day),
    kind: row.kind as ActivityKind,
    templateCode: row.templateCode,
    title: row.title,
    load: row.load as PlanLoad,
    startTime: row.startTime,
    plannedDurationMin: row.plannedDurationMin,
    plannedDistanceM: row.plannedDistanceM,
    targetPaceSecPerKm: row.targetPaceSecPerKm,
    structure:
      structure && typeof structure === 'object' && !Array.isArray(structure)
        ? (structure as Record<string, unknown>)
        : null,
    notes: row.notes,
    completedAt: row.completedAt,
    completedSessionId: row.completedSessionId,
    actualNotes: row.actualNotes,
    skipped: row.skipped,
  };
}

/** En una columna JSON, `null` de JS no es NULL de SQL. */
const json = (value: Record<string, unknown> | null) =>
  value === null ? Prisma.DbNull : (value as Prisma.InputJsonObject);

@Injectable()
export class PrismaRitmoPlanRepository implements RitmoPlanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePlan(userId: string): Promise<Plan | null> {
    const row = await this.prisma.ritmoPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toPlan(row) : null;
  }

  async saveActivePlan(userId: string, data: SavePlanData): Promise<Plan> {
    const values = {
      ...data,
      raceDate: data.raceDate ? toDateOnly(data.raceDate) : null,
    };
    const active = await this.prisma.ritmoPlan.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    const row = active
      ? await this.prisma.ritmoPlan.update({
          where: { id: active.id },
          data: values,
        })
      : await this.prisma.ritmoPlan.create({ data: { userId, ...values } });
    return toPlan(row);
  }

  async archiveActivePlan(userId: string): Promise<boolean> {
    const { count } = await this.prisma.ritmoPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return count > 0;
  }

  async plannedBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<PlannedSession[]> {
    const rows = await this.prisma.ritmoPlannedSession.findMany({
      where: { userId, day: { gte: toDateOnly(from), lte: toDateOnly(to) } },
      orderBy: { day: 'asc' },
    });
    return rows.map(toPlanned);
  }

  async findPlanned(
    userId: string,
    day: string,
  ): Promise<PlannedSession | null> {
    const row = await this.prisma.ritmoPlannedSession.findUnique({
      where: { userId_day: { userId, day: toDateOnly(day) } },
    });
    return row ? toPlanned(row) : null;
  }

  async upsertPlanned(
    userId: string,
    day: string,
    planId: string | null,
    data: PlannedSessionData,
  ): Promise<PlannedSession> {
    const values = { ...data, planId, structure: json(data.structure) };
    const row = await this.prisma.ritmoPlannedSession.upsert({
      where: { userId_day: { userId, day: toDateOnly(day) } },
      // Sustituir la sesión de un día borra su check: ya no es la misma.
      update: {
        ...values,
        completedAt: null,
        completedSessionId: null,
        actualNotes: null,
        skipped: false,
      },
      create: { userId, day: toDateOnly(day), ...values },
    });
    return toPlanned(row);
  }

  async deletePlanned(userId: string, day: string): Promise<boolean> {
    const { count } = await this.prisma.ritmoPlannedSession.deleteMany({
      where: { userId, day: toDateOnly(day) },
    });
    return count > 0;
  }

  async setCompletion(
    userId: string,
    day: string,
    data: CompletionData,
  ): Promise<PlannedSession | null> {
    const { count } = await this.prisma.ritmoPlannedSession.updateMany({
      where: { userId, day: toDateOnly(day) },
      data,
    });
    return count ? this.findPlanned(userId, day) : null;
  }

  async actualsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<ActualSession[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: {
        userId,
        loggedOn: { gte: toDateOnly(from), lte: toDateOnly(to) },
      },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        loggedOn: true,
        durationSec: true,
        distanceM: true,
        activityType: { select: { kind: true, name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      day: toDay(r.loggedOn),
      kind: r.activityType.kind,
      title: r.activityType.name,
      durationSec: r.durationSec,
      distanceM: r.distanceM,
    }));
  }
}
