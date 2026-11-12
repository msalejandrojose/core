import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  Exercise,
  HeartConfig,
  Muscle,
  PerfMetric,
  PerfOrigin,
  PerformanceMeasurement,
  TrainingSession,
  ZoneMethod,
} from '../../domain/entities/performance.entity';
import type {
  AddMeasurementData,
  CreateExerciseData,
  RitmoPerformanceRepositoryPort,
} from '../../application/ports/ritmo-performance-repository.port';
import type {
  RecommendationState,
  RecommendationStatus,
} from '../../domain/services/performance/recommendation-state';
import { sortSets, toDateOnly, toDay, toZoneSeconds } from './ritmo.mapper';

/** Los pesos del catálogo y, si los hay, los ajustes de un usuario. */
const exerciseInclude = (userId: string) =>
  ({ muscles: true, overrides: { where: { userId } } }) as const;

interface ExerciseRow {
  id: string;
  code: string | null;
  name: string;
  isCompound: boolean;
  isBodyweight: boolean;
  ownerUserId: string | null;
  muscles: { muscle: string; weight: unknown }[];
  overrides?: { muscle: string; weight: unknown }[];
}

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isCompound: row.isCompound,
    isBodyweight: row.isBodyweight,
    ownerUserId: row.ownerUserId,
    customized: !!row.overrides?.length,
    // Con ajustes personales, sustituyen por completo a los del catálogo.
    muscles: (row.overrides?.length ? row.overrides : row.muscles)
      .map((m) => ({ muscle: m.muscle as Muscle, weight: Number(m.weight) }))
      .sort((a, b) => b.weight - a.weight),
  };
}

interface HeartRow {
  maxHr: number | null;
  restingHr: number | null;
  method: string;
  customZones: unknown;
}

function toHeartConfig(row: HeartRow): HeartConfig {
  const zones = row.customZones;
  return {
    maxHr: row.maxHr,
    restingHr: row.restingHr,
    method: row.method as ZoneMethod,
    customZones:
      Array.isArray(zones) &&
      zones.length > 0 &&
      zones.every((z) => typeof z === 'number')
        ? zones
        : null,
  };
}

interface MeasurementRow {
  id: string;
  metric: string;
  value: unknown;
  heartRate: number | null;
  origin: string;
  sourceLabel: string | null;
  measuredOn: Date;
}

function toMeasurement(row: MeasurementRow): PerformanceMeasurement {
  return {
    id: row.id,
    metric: row.metric as PerfMetric,
    value: Number(row.value),
    heartRate: row.heartRate,
    origin: row.origin as PerfOrigin,
    sourceLabel: row.sourceLabel,
    measuredOn: toDay(row.measuredOn),
  };
}

@Injectable()
export class PrismaRitmoPerformanceRepository implements RitmoPerformanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private visibleTo(userId: string) {
    return {
      isArchived: false,
      OR: [{ ownerUserId: null }, { ownerUserId: userId }],
    };
  }

  async listExercisesVisibleTo(userId: string): Promise<Exercise[]> {
    const rows = await this.prisma.ritmoExercise.findMany({
      where: this.visibleTo(userId),
      include: exerciseInclude(userId),
      orderBy: { name: 'asc' },
    });
    return rows.map(toExercise);
  }

  async missingExercises(ids: string[], userId: string): Promise<string[]> {
    if (!ids.length) return [];
    const found = await this.prisma.ritmoExercise.findMany({
      where: { id: { in: ids }, ...this.visibleTo(userId) },
      select: { id: true },
    });
    const ok = new Set(found.map((f) => f.id));
    return ids.filter((id) => !ok.has(id));
  }

  async createExercise(data: CreateExerciseData): Promise<Exercise> {
    const row = await this.prisma.ritmoExercise.create({
      data: {
        name: data.name,
        isCompound: data.isCompound,
        isBodyweight: data.isBodyweight,
        ownerUserId: data.userId,
        muscles: { create: data.muscles },
      },
      include: exerciseInclude(data.userId),
    });
    return toExercise(row);
  }

  private async findExercise(
    exerciseId: string,
    userId: string,
  ): Promise<Exercise | null> {
    const row = await this.prisma.ritmoExercise.findFirst({
      where: { id: exerciseId, ...this.visibleTo(userId) },
      include: exerciseInclude(userId),
    });
    return row ? toExercise(row) : null;
  }

  async setExerciseMuscles(
    exerciseId: string,
    userId: string,
    muscles: { muscle: Muscle; weight: number }[],
  ): Promise<Exercise | null> {
    const exercise = await this.findExercise(exerciseId, userId);
    if (!exercise) return null;
    if (exercise.ownerUserId === userId) {
      await this.prisma.$transaction([
        this.prisma.ritmoExerciseMuscle.deleteMany({ where: { exerciseId } }),
        this.prisma.ritmoExerciseMuscle.createMany({
          data: muscles.map((m) => ({ exerciseId, ...m })),
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.ritmoExerciseMuscleOverride.deleteMany({
          where: { exerciseId, userId },
        }),
        this.prisma.ritmoExerciseMuscleOverride.createMany({
          data: muscles.map((m) => ({ exerciseId, userId, ...m })),
        }),
      ]);
    }
    return this.findExercise(exerciseId, userId);
  }

  async resetExerciseMuscles(
    exerciseId: string,
    userId: string,
  ): Promise<Exercise | null> {
    await this.prisma.ritmoExerciseMuscleOverride.deleteMany({
      where: { exerciseId, userId },
    });
    return this.findExercise(exerciseId, userId);
  }

  async getHeartConfig(userId: string): Promise<HeartConfig | null> {
    const row = await this.prisma.ritmoHeartConfig.findUnique({
      where: { userId },
    });
    return row ? toHeartConfig(row) : null;
  }

  async saveHeartConfig(
    userId: string,
    config: HeartConfig,
  ): Promise<HeartConfig> {
    const values = {
      maxHr: config.maxHr,
      restingHr: config.restingHr,
      method: config.method,
      // Prisma distingue "no tocar" (undefined) de "poner a NULL" en JSON:
      // un array vacío se guarda como `[]` y `toHeartConfig` lo lee como sin zonas.
      customZones: config.customZones ?? [],
    };
    const row = await this.prisma.ritmoHeartConfig.upsert({
      where: { userId },
      update: values,
      create: { userId, ...values },
    });
    return toHeartConfig(row);
  }

  async listMeasurements(userId: string): Promise<PerformanceMeasurement[]> {
    const rows = await this.prisma.ritmoPerformanceMeasurement.findMany({
      where: { userId },
      orderBy: { measuredOn: 'desc' },
    });
    return rows.map(toMeasurement);
  }

  async addMeasurement(
    data: AddMeasurementData,
  ): Promise<PerformanceMeasurement> {
    const row = await this.prisma.ritmoPerformanceMeasurement.create({
      data: { ...data, measuredOn: toDateOnly(data.measuredOn) },
    });
    return toMeasurement(row);
  }

  async deleteMeasurement(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.ritmoPerformanceMeasurement.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  async trainingHistory(
    userId: string,
    fromDay: string | null,
  ): Promise<TrainingSession[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: {
        userId,
        ...(fromDay ? { loggedOn: { gte: toDateOnly(fromDay) } } : {}),
      },
      include: {
        activityType: { select: { code: true, kind: true } },
        strengthSets: true,
      },
      orderBy: { startedAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      day: toDay(r.loggedOn),
      kind: r.activityType.kind,
      activityCode: r.activityType.code,
      durationSec: r.durationSec,
      distanceM: r.distanceM,
      avgHeartRate: r.avgHeartRate,
      maxHeartRate: r.maxHeartRate,
      elevationGainM: r.elevationGainM,
      cadence: r.cadence,
      rpe: r.rpe,
      effort: r.effort,
      zoneSeconds: toZoneSeconds(r.zoneSeconds),
      sets: sortSets(r.strengthSets),
    }));
  }

  async listRecommendationStates(
    userId: string,
  ): Promise<RecommendationState[]> {
    const rows = await this.prisma.ritmoRecommendationState.findMany({
      where: { userId },
    });
    return rows.map((r) => ({
      key: r.key,
      status: r.status,
      firstDetectedOn: toDay(r.firstDetectedOn),
      lastSeenOn: toDay(r.lastSeenOn),
    }));
  }

  async saveRecommendationStates(
    userId: string,
    states: RecommendationState[],
  ): Promise<void> {
    if (!states.length) return;
    await this.prisma.$transaction(
      states.map((s) => {
        const values = {
          status: s.status,
          firstDetectedOn: toDateOnly(s.firstDetectedOn),
          lastSeenOn: toDateOnly(s.lastSeenOn),
        };
        return this.prisma.ritmoRecommendationState.upsert({
          where: { userId_key: { userId, key: s.key } },
          update: values,
          create: { userId, key: s.key, ...values },
        });
      }),
    );
  }

  async setRecommendationStatus(
    userId: string,
    key: string,
    status: RecommendationStatus,
  ): Promise<boolean> {
    const { count } = await this.prisma.ritmoRecommendationState.updateMany({
      where: { userId, key },
      data: { status },
    });
    return count > 0;
  }
}
