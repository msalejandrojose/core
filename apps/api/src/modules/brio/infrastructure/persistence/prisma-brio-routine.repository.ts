import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { CleanRoutine } from '../../domain/services/routine';
import type {
  BrioRoutineRepositoryPort,
  LinkableSession,
  PreviousSets,
  RoutineView,
} from '../../application/ports/routine.port';

const INCLUDE = {
  exercises: {
    orderBy: { position: 'asc' },
    include: {
      exercise: {
        select: {
          code: true,
          name: true,
          muscles: { select: { muscle: true, weight: true } },
        },
      },
    },
  },
  sessions: {
    orderBy: { startedAt: 'desc' },
    take: 1,
    select: { startedAt: true },
  },
  _count: { select: { sessions: true } },
} satisfies Prisma.BrioRoutineInclude;

type Row = Prisma.BrioRoutineGetPayload<{ include: typeof INCLUDE }>;

const toView = (r: Row): RoutineView => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  notes: r.notes,
  plannedDurationMin: r.plannedDurationMin,
  plannedDistanceM: r.plannedDistanceM,
  targetPaceSecPerKm: r.targetPaceSecPerKm,
  hevyRoutineId: r.hevyRoutineId,
  hevySentAt: r.hevySentAt,
  exercises: r.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    code: e.exercise.code,
    name: e.exercise.name,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weightKg == null ? null : Number(e.weightKg),
    restSec: e.restSec,
    supersetGroup: e.supersetGroup,
    muscles: e.exercise.muscles.map((m) => ({
      muscle: m.muscle,
      weight: Number(m.weight),
    })),
  })),
  lastDoneAt: r.sessions[0]?.startedAt ?? null,
  timesDone: r._count.sessions,
});

const exerciseRows = (data: CleanRoutine) =>
  data.exercises.map((e, i) => ({
    exerciseId: e.exerciseId,
    position: i,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weightKg,
    restSec: e.restSec,
    supersetGroup: e.supersetGroup,
  }));

const fields = (data: CleanRoutine) => ({
  name: data.name,
  kind: data.kind,
  notes: data.notes,
  plannedDurationMin: data.plannedDurationMin,
  plannedDistanceM: data.plannedDistanceM,
  targetPaceSecPerKm: data.targetPaceSecPerKm,
});

@Injectable()
export class PrismaBrioRoutineRepository implements BrioRoutineRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<RoutineView[]> {
    const rows = await this.prisma.brioRoutine.findMany({
      where: { userId, isArchived: false },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toView);
  }

  async get(userId: string, id: string): Promise<RoutineView | null> {
    const row = await this.prisma.brioRoutine.findFirst({
      where: { id, userId, isArchived: false },
      include: INCLUDE,
    });
    return row ? toView(row) : null;
  }

  async create(userId: string, data: CleanRoutine): Promise<string> {
    const row = await this.prisma.brioRoutine.create({
      data: {
        userId,
        ...fields(data),
        exercises: { create: exerciseRows(data) },
      },
      select: { id: true },
    });
    return row.id;
  }

  async update(
    userId: string,
    id: string,
    data: CleanRoutine,
  ): Promise<boolean> {
    const found = await this.prisma.brioRoutine.count({
      where: { id, userId, isArchived: false },
    });
    if (!found) return false;
    await this.prisma.$transaction([
      this.prisma.brioRoutineExercise.deleteMany({ where: { routineId: id } }),
      this.prisma.brioRoutine.update({
        where: { id },
        data: { ...fields(data), exercises: { create: exerciseRows(data) } },
      }),
    ]);
    return true;
  }

  async archive(userId: string, id: string): Promise<boolean> {
    // Se archiva en vez de borrar: los entrenos hechos con ella la siguen nombrando.
    const r = await this.prisma.brioRoutine.updateMany({
      where: { id, userId, isArchived: false },
      data: { isArchived: true },
    });
    return r.count > 0;
  }

  async missingExercises(userId: string, ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const rows = await this.prisma.brioExercise.findMany({
      where: {
        id: { in: unique },
        isArchived: false,
        OR: [{ ownerUserId: null }, { ownerUserId: userId }],
      },
      select: { id: true },
    });
    const ok = new Set(rows.map((r) => r.id));
    return unique.filter((id) => !ok.has(id));
  }

  async setHevyRoutine(
    id: string,
    hevyRoutineId: string | null,
  ): Promise<void> {
    await this.prisma.brioRoutine.update({
      where: { id },
      data: { hevyRoutineId, hevySentAt: new Date() },
    });
  }

  async linkSession(
    userId: string,
    sessionId: string,
    routineId: string,
  ): Promise<boolean> {
    const owns = await this.prisma.brioRoutine.count({
      where: { id: routineId, userId },
    });
    if (!owns) return false;
    const r = await this.prisma.brioActivitySession.updateMany({
      where: { id: sessionId, userId },
      data: { routineId },
    });
    return r.count > 0;
  }

  async linkImported(
    userId: string,
    source: 'HEVY' | 'GARMIN',
    externalId: string,
    routineId: string,
  ): Promise<void> {
    await this.prisma.brioActivitySession.updateMany({
      where: { userId, source, externalId, routineId: null },
      data: { routineId },
    });
  }

  async unlinkedGarminSessions(
    userId: string,
    since: Date,
  ): Promise<LinkableSession[]> {
    const rows = await this.prisma.brioActivitySession.findMany({
      where: {
        userId,
        source: 'GARMIN',
        routineId: null,
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
        activityType: { select: { kind: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      kind: r.activityType.kind,
    }));
  }

  async previousSets(
    userId: string,
    exerciseIds: string[],
  ): Promise<PreviousSets[]> {
    const ids = [...new Set(exerciseIds)];
    if (!ids.length) return [];
    const rows = await this.prisma.brioStrengthSet.findMany({
      where: { userId, exerciseId: { in: ids }, isWarmup: false },
      orderBy: [{ session: { startedAt: 'desc' } }, { setOrder: 'asc' }],
      take: 400,
      select: {
        exerciseId: true,
        sessionId: true,
        weightKg: true,
        reps: true,
        session: { select: { startedAt: true } },
      },
    });
    // De cada ejercicio, solo las series de su sesión más reciente.
    const out = new Map<string, PreviousSets & { sessionId: string }>();
    for (const r of rows) {
      const cur = out.get(r.exerciseId);
      if (!cur)
        out.set(r.exerciseId, {
          exerciseId: r.exerciseId,
          sessionId: r.sessionId,
          startedAt: r.session.startedAt,
          sets: [{ weightKg: Number(r.weightKg), reps: r.reps }],
        });
      else if (cur.sessionId === r.sessionId)
        cur.sets.push({ weightKg: Number(r.weightKg), reps: r.reps });
    }
    return [...out.values()].map((p) => ({
      exerciseId: p.exerciseId,
      startedAt: p.startedAt,
      sets: p.sets,
    }));
  }
}
