import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  SaveTemplateData,
  WorkoutTemplate,
  WorkoutTemplatePort,
} from '../../application/ports/workout-template.port';

const include = {
  exercises: {
    orderBy: { position: 'asc' },
    include: { exercise: { select: { name: true, isBodyweight: true } } },
  },
} as const;

interface Row {
  id: string;
  name: string;
  updatedAt: Date;
  exercises: {
    exerciseId: string;
    sets: number;
    reps: number | null;
    weightKg: unknown;
    exercise: { name: string; isBodyweight: boolean };
  }[];
}

function toTemplate(row: Row): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    exercises: row.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      isBodyweight: e.exercise.isBodyweight,
      sets: e.sets,
      reps: e.reps,
      weightKg: e.weightKg == null ? null : Number(e.weightKg),
    })),
  };
}

const rows = (data: SaveTemplateData) =>
  data.exercises.map((e, position) => ({
    position,
    exerciseId: e.exerciseId,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weightKg,
  }));

@Injectable()
export class PrismaWorkoutTemplateRepository implements WorkoutTemplatePort {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<WorkoutTemplate[]> {
    const found = await this.prisma.ritmoWorkoutTemplate.findMany({
      where: { userId },
      include,
      orderBy: { name: 'asc' },
    });
    return found.map(toTemplate);
  }

  async upsertByName(
    userId: string,
    data: SaveTemplateData,
  ): Promise<WorkoutTemplate> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.ritmoWorkoutTemplate.findUnique({
        where: { userId_name: { userId, name: data.name } },
        select: { id: true },
      });
      if (existing) {
        await tx.ritmoWorkoutTemplateExercise.deleteMany({
          where: { templateId: existing.id },
        });
        return toTemplate(
          await tx.ritmoWorkoutTemplate.update({
            where: { id: existing.id },
            data: { exercises: { create: rows(data) } },
            include,
          }),
        );
      }
      return toTemplate(
        await tx.ritmoWorkoutTemplate.create({
          data: { userId, name: data.name, exercises: { create: rows(data) } },
          include,
        }),
      );
    });
  }

  async update(
    userId: string,
    id: string,
    data: SaveTemplateData,
  ): Promise<WorkoutTemplate | null | 'NAME_TAKEN'> {
    return this.prisma.$transaction(async (tx) => {
      const own = await tx.ritmoWorkoutTemplate.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!own) return null;
      const clash = await tx.ritmoWorkoutTemplate.findFirst({
        where: { userId, name: data.name, NOT: { id } },
        select: { id: true },
      });
      if (clash) return 'NAME_TAKEN';
      await tx.ritmoWorkoutTemplateExercise.deleteMany({
        where: { templateId: id },
      });
      return toTemplate(
        await tx.ritmoWorkoutTemplate.update({
          where: { id },
          data: { name: data.name, exercises: { create: rows(data) } },
          include,
        }),
      );
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const r = await this.prisma.ritmoWorkoutTemplate.deleteMany({
      where: { id, userId },
    });
    return r.count > 0;
  }
}
