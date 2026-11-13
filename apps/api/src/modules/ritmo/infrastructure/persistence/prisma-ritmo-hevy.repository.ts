import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { MuscleWeight } from '../../domain/entities/performance.entity';
import type {
  HevyConnection,
  ImportedSessionData,
  PlannedForHevy,
  RitmoHevyRepositoryPort,
  StrengthSessionWithSets,
} from '../../application/ports/hevy.port';
import { toDateOnly, toDay } from './ritmo.mapper';

@Injectable()
export class PrismaRitmoHevyRepository implements RitmoHevyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getConnection(userId: string): Promise<HevyConnection | null> {
    return this.prisma.ritmoHevyConnection.findUnique({
      where: { userId },
      select: {
        apiKeyEnc: true,
        username: true,
        lastSyncAt: true,
        lastSyncCount: true,
        lastError: true,
      },
    });
  }

  async saveConnection(
    userId: string,
    data: { apiKeyEnc: string; username: string | null },
  ): Promise<void> {
    await this.prisma.ritmoHevyConnection.upsert({
      where: { userId },
      // Una clave nueva puede ser de otra cuenta: se vuelve a importar entero.
      update: {
        ...data,
        lastSyncAt: null,
        lastSyncCount: null,
        lastError: null,
      },
      create: { userId, ...data },
    });
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.prisma.ritmoHevyConnection.deleteMany({ where: { userId } });
  }

  async markSync(
    userId: string,
    data: {
      lastSyncAt?: Date;
      lastSyncCount?: number;
      lastError: string | null;
    },
  ): Promise<void> {
    await this.prisma.ritmoHevyConnection.updateMany({
      where: { userId },
      data,
    });
  }

  countImported(userId: string): Promise<number> {
    return this.prisma.ritmoActivitySession.count({
      where: { userId, source: 'HEVY' },
    });
  }

  links(userId: string): Promise<{ templateId: string; exerciseId: string }[]> {
    return this.prisma.ritmoHevyExerciseLink.findMany({
      where: { userId },
      select: { templateId: true, exerciseId: true },
    });
  }

  async saveLink(
    userId: string,
    templateId: string,
    exerciseId: string,
  ): Promise<void> {
    await this.prisma.ritmoHevyExerciseLink.upsert({
      where: { userId_templateId: { userId, templateId } },
      update: { exerciseId },
      create: { userId, templateId, exerciseId },
    });
  }

  async catalog(): Promise<{ id: string; code: string }[]> {
    const rows = await this.prisma.ritmoExercise.findMany({
      where: { ownerUserId: null, isArchived: false, code: { not: null } },
      select: { id: true, code: true },
    });
    return rows.map((r) => ({ id: r.id, code: r.code! }));
  }

  async ensureOwnExercise(
    userId: string,
    data: { name: string; isBodyweight: boolean; muscles: MuscleWeight[] },
  ): Promise<string> {
    const name = data.name.slice(0, 120);
    const found = await this.prisma.ritmoExercise.findFirst({
      where: { ownerUserId: userId, name },
      select: { id: true },
    });
    if (found) return found.id;
    const row = await this.prisma.ritmoExercise.create({
      data: {
        name,
        isCompound: data.muscles.length > 1,
        isBodyweight: data.isBodyweight,
        ownerUserId: userId,
        muscles: { create: data.muscles },
      },
      select: { id: true },
    });
    return row.id;
  }

  async strengthType(
    userId: string,
  ): Promise<{ id: string; met: number } | null> {
    const row = await this.prisma.ritmoActivityType.findFirst({
      where: {
        kind: 'STRENGTH',
        isArchived: false,
        OR: [{ ownerUserId: null }, { ownerUserId: userId }],
      },
      // El del catálogo antes que uno propio, y siempre el mismo.
      orderBy: [{ ownerUserId: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, met: true },
    });
    return row ? { id: row.id, met: Number(row.met) } : null;
  }

  async upsertImported(
    userId: string,
    externalId: string,
    data: ImportedSessionData,
  ): Promise<{ created: boolean; previousDay: string | null }> {
    const { sets, loggedOn, ...session } = data;
    const fields = { ...session, loggedOn: toDateOnly(loggedOn) };
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.ritmoActivitySession.findUnique({
        where: { source_externalId: { source: 'HEVY', externalId } },
        select: { id: true, userId: true, loggedOn: true },
      });
      // El id de Hevy es global: si ya lo importó otra cuenta, no se toca.
      if (existing && existing.userId !== userId)
        return { created: false, previousDay: null };

      const setRows = (sessionId: string) =>
        sets.map((s) => ({ ...s, sessionId, userId }));
      if (existing) {
        await tx.ritmoActivitySession.update({
          where: { id: existing.id },
          data: fields,
        });
        await tx.ritmoStrengthSet.deleteMany({
          where: { sessionId: existing.id },
        });
        if (sets.length)
          await tx.ritmoStrengthSet.createMany({ data: setRows(existing.id) });
        return { created: false, previousDay: toDay(existing.loggedOn) };
      }
      const row = await tx.ritmoActivitySession.create({
        data: { userId, source: 'HEVY', externalId, ...fields },
        select: { id: true },
      });
      if (sets.length)
        await tx.ritmoStrengthSet.createMany({ data: setRows(row.id) });
      return { created: true, previousDay: null };
    });
  }

  async deleteImported(
    userId: string,
    externalId: string,
  ): Promise<string | null> {
    const row = await this.prisma.ritmoActivitySession.findFirst({
      where: { userId, source: 'HEVY', externalId },
      select: { id: true, loggedOn: true },
    });
    if (!row) return null;
    await this.prisma.ritmoActivitySession.delete({ where: { id: row.id } });
    return toDay(row.loggedOn);
  }

  async recentStrengthSessions(
    userId: string,
    limit: number,
  ): Promise<StrengthSessionWithSets[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: { userId, strengthSets: { some: {} } },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        loggedOn: true,
        strengthSets: {
          orderBy: [{ exerciseOrder: 'asc' }, { setOrder: 'asc' }],
          include: {
            exercise: {
              select: {
                name: true,
                code: true,
                muscles: { orderBy: { weight: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      day: toDay(r.loggedOn),
      sets: r.strengthSets.map((s) => ({
        exerciseId: s.exerciseId,
        exerciseOrder: s.exerciseOrder,
        setOrder: s.setOrder,
        weightKg: Number(s.weightKg),
        reps: s.reps,
        rir: s.rir,
        restSec: s.restSec,
        isWarmup: s.isWarmup,
        exerciseName: s.exercise.name,
        exerciseCode: s.exercise.code,
        primaryMuscle: s.exercise.muscles[0]?.muscle ?? null,
      })),
    }));
  }

  async getPlanned(
    userId: string,
    day: string,
  ): Promise<PlannedForHevy | null> {
    const row = await this.prisma.ritmoPlannedSession.findUnique({
      where: { userId_day: { userId, day: toDateOnly(day) } },
      select: { kind: true, title: true, templateCode: true, structure: true },
    });
    if (!row) return null;
    return {
      kind: row.kind,
      title: row.title,
      templateCode: row.templateCode,
      structure:
        row.structure && typeof row.structure === 'object'
          ? (row.structure as Record<string, unknown>)
          : null,
    };
  }

  async savePlannedStructure(
    userId: string,
    day: string,
    structure: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.ritmoPlannedSession.update({
      where: { userId_day: { userId, day: toDateOnly(day) } },
      data: { structure: structure as Prisma.InputJsonValue },
    });
  }
}
