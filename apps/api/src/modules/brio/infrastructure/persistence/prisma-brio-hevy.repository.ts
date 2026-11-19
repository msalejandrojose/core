import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  MuscleWeight,
  StrengthSet,
} from '../../domain/entities/performance.entity';
import type {
  HevyConnection,
  ImportedWorkoutItem,
  ImportedWorkoutOutcome,
  PlannedForHevy,
  BrioHevyRepositoryPort,
  StrengthSessionWithSets,
} from '../../application/ports/hevy.port';
import { toDateOnly, toDay } from './brio.mapper';

/** Entrenos por tanda al importar (una transacción corta por tanda). */
const IMPORT_CHUNK = 50;

type StoredSet = Omit<StrengthSet, 'weightKg'> & { weightKg: Prisma.Decimal };

/** ¿Las series guardadas son las mismas que las que llegan? */
function sameSets(stored: StoredSet[], incoming: StrengthSet[]): boolean {
  if (stored.length !== incoming.length) return false;
  const norm = (s: StrengthSet | StoredSet) =>
    [
      s.exerciseId,
      s.exerciseOrder,
      s.setOrder,
      Number(s.weightKg).toFixed(2),
      s.reps,
      s.rir ?? null,
      s.restSec ?? null,
      s.isWarmup,
      s.distanceM ?? null,
      s.durationSec ?? null,
      s.calories ?? null,
    ].join('|');
  const sorted = [...incoming].sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder || a.setOrder - b.setOrder,
  );
  return stored.every((s, i) => norm(s) === norm(sorted[i]));
}

@Injectable()
export class PrismaBrioHevyRepository implements BrioHevyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getConnection(userId: string): Promise<HevyConnection | null> {
    return this.prisma.brioHevyConnection.findUnique({
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
    await this.prisma.brioHevyConnection.upsert({
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
    await this.prisma.brioHevyConnection.deleteMany({ where: { userId } });
  }

  async markSync(
    userId: string,
    data: {
      lastSyncAt?: Date;
      lastSyncCount?: number;
      lastError: string | null;
    },
  ): Promise<void> {
    await this.prisma.brioHevyConnection.updateMany({
      where: { userId },
      data,
    });
  }

  countImported(userId: string): Promise<number> {
    return this.prisma.brioActivitySession.count({
      where: { userId, source: 'HEVY' },
    });
  }

  links(userId: string): Promise<{ templateId: string; exerciseId: string }[]> {
    return this.prisma.brioHevyExerciseLink.findMany({
      where: { userId },
      select: { templateId: true, exerciseId: true },
    });
  }

  async saveLink(
    userId: string,
    templateId: string,
    exerciseId: string,
  ): Promise<void> {
    await this.prisma.brioHevyExerciseLink.upsert({
      where: { userId_templateId: { userId, templateId } },
      update: { exerciseId },
      create: { userId, templateId, exerciseId },
    });
  }

  async catalog(): Promise<{ id: string; code: string }[]> {
    const rows = await this.prisma.brioExercise.findMany({
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
    const found = await this.prisma.brioExercise.findFirst({
      where: { ownerUserId: userId, name },
      select: { id: true },
    });
    if (found) return found.id;
    const row = await this.prisma.brioExercise.create({
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
    const row = await this.prisma.brioActivityType.findFirst({
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

  async upsertImportedMany(
    userId: string,
    items: ImportedWorkoutItem[],
  ): Promise<ImportedWorkoutOutcome[]> {
    const out: ImportedWorkoutOutcome[] = [];
    // Por tandas: pocas consultas por tanda, y ninguna transacción enorme.
    for (let i = 0; i < items.length; i += IMPORT_CHUNK)
      out.push(
        ...(await this.upsertChunk(userId, items.slice(i, i + IMPORT_CHUNK))),
      );
    return out;
  }

  private async upsertChunk(
    userId: string,
    items: ImportedWorkoutItem[],
  ): Promise<ImportedWorkoutOutcome[]> {
    const existing = await this.prisma.brioActivitySession.findMany({
      where: {
        source: 'HEVY',
        externalId: { in: items.map((it) => it.externalId) },
      },
      select: {
        id: true,
        userId: true,
        externalId: true,
        activityTypeId: true,
        startedAt: true,
        loggedOn: true,
        durationSec: true,
        kcalBurned: true,
        notes: true,
        routineId: true,
        strengthSets: {
          orderBy: [{ exerciseOrder: 'asc' }, { setOrder: 'asc' }],
          select: {
            exerciseId: true,
            exerciseOrder: true,
            setOrder: true,
            weightKg: true,
            reps: true,
            rir: true,
            restSec: true,
            isWarmup: true,
            distanceM: true,
            durationSec: true,
            calories: true,
          },
        },
      },
    });
    const byExternalId = new Map(existing.map((e) => [e.externalId!, e]));

    const newSessions: Prisma.BrioActivitySessionCreateManyInput[] = [];
    const replacedSetsOf: string[] = [];
    const newSets: Prisma.BrioStrengthSetCreateManyInput[] = [];
    const updates: Prisma.PrismaPromise<unknown>[] = [];
    const out: ImportedWorkoutOutcome[] = [];

    for (const { externalId, data, routineId } of items) {
      const { sets, loggedOn, ...session } = data;
      const fields = { ...session, loggedOn: toDateOnly(loggedOn) };
      const row = byExternalId.get(externalId);
      const setRows = (sessionId: string) =>
        sets.map((s) => ({ ...s, sessionId, userId }));

      if (!row) {
        const id = randomUUID();
        newSessions.push({
          id,
          userId,
          source: 'HEVY',
          externalId,
          routineId,
          ...fields,
        });
        newSets.push(...setRows(id));
        // Por si el archivo trae el mismo entreno dos veces.
        byExternalId.set(externalId, {
          id,
          userId,
          externalId,
          ...fields,
          routineId,
          strengthSets: sets.map((s) => ({
            ...s,
            weightKg: new Prisma.Decimal(s.weightKg),
            distanceM: s.distanceM ?? null,
            durationSec: s.durationSec ?? null,
            calories: s.calories ?? null,
          })),
        });
        out.push({ created: true, changed: false, previousDay: null });
        continue;
      }
      // El id de Hevy es global: si ya lo importó otra cuenta, no se toca.
      if (row.userId !== userId) {
        out.push({ created: false, changed: false, previousDay: null });
        continue;
      }
      const sessionChanged =
        row.activityTypeId !== fields.activityTypeId ||
        row.startedAt.getTime() !== fields.startedAt.getTime() ||
        toDay(row.loggedOn) !== loggedOn ||
        row.durationSec !== fields.durationSec ||
        row.kcalBurned !== fields.kcalBurned ||
        (row.notes ?? null) !== (fields.notes ?? null);
      const setsChanged = !sameSets(row.strengthSets, sets);
      const link = !row.routineId && routineId ? { routineId } : {};
      if (sessionChanged || 'routineId' in link)
        updates.push(
          this.prisma.brioActivitySession.update({
            where: { id: row.id },
            data: { ...fields, ...link },
          }),
        );
      if (setsChanged) {
        replacedSetsOf.push(row.id);
        newSets.push(...setRows(row.id));
      }
      out.push({
        created: false,
        changed: sessionChanged || setsChanged || 'routineId' in link,
        previousDay: toDay(row.loggedOn),
      });
    }

    const writes: Prisma.PrismaPromise<unknown>[] = [];
    if (newSessions.length)
      writes.push(
        this.prisma.brioActivitySession.createMany({ data: newSessions }),
      );
    if (replacedSetsOf.length)
      writes.push(
        this.prisma.brioStrengthSet.deleteMany({
          where: { sessionId: { in: replacedSetsOf } },
        }),
      );
    writes.push(...updates);
    if (newSets.length)
      writes.push(this.prisma.brioStrengthSet.createMany({ data: newSets }));
    if (writes.length) await this.prisma.$transaction(writes);
    return out;
  }

  async deleteImported(
    userId: string,
    externalId: string,
  ): Promise<string | null> {
    const row = await this.prisma.brioActivitySession.findFirst({
      where: { userId, source: 'HEVY', externalId },
      select: { id: true, loggedOn: true },
    });
    if (!row) return null;
    await this.prisma.brioActivitySession.delete({ where: { id: row.id } });
    return toDay(row.loggedOn);
  }

  async recentStrengthSessions(
    userId: string,
    limit: number,
  ): Promise<StrengthSessionWithSets[]> {
    const rows = await this.prisma.brioActivitySession.findMany({
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
    const row = await this.prisma.brioPlannedSession.findUnique({
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
    await this.prisma.brioPlannedSession.update({
      where: { userId_day: { userId, day: toDateOnly(day) } },
      data: { structure: structure as Prisma.InputJsonValue },
    });
  }
}
