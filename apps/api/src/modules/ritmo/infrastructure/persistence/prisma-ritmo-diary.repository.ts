import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import type {
  MealEntry,
  MealType,
} from '../../domain/entities/meal-entry.entity';
import type {
  CreateMealEntryData,
  DailyLogPatch,
  DayIntakeTotals,
  RitmoDiaryRepositoryPort,
  DayMealCount,
} from '../../application/ports/ritmo-diary-repository.port';
import {
  num,
  toDailyLog,
  toDateOnly,
  toDay,
  toMealEntry,
} from './ritmo.mapper';

const FOOD_NAME = {
  food: { select: { name: true, brand: true } },
} as const;

@Injectable()
export class PrismaRitmoDiaryRepository implements RitmoDiaryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createMealEntry(data: CreateMealEntryData): Promise<MealEntry> {
    const row = await this.prisma.ritmoMealEntry.create({
      data: {
        userId: data.userId,
        loggedOn: toDateOnly(data.loggedOn),
        mealType: data.mealType,
        foodId: data.foodId,
        servingId: data.servingId,
        // Solo se guarda `customName` cuando NO hay alimento de catálogo: con
        // alimento, el nombre se resuelve por join y no se duplica.
        customName: data.foodId ? null : data.name,
        quantityG: data.quantityG,
        kcal: data.kcal,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
      },
      include: FOOD_NAME,
    });
    return toMealEntry(row);
  }

  async findMealEntry(id: string, userId: string): Promise<MealEntry | null> {
    const row = await this.prisma.ritmoMealEntry.findFirst({
      where: { id, userId },
      include: FOOD_NAME,
    });
    return row ? toMealEntry(row) : null;
  }

  async deleteMealEntry(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.ritmoMealEntry.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  async listMealEntriesByDay(
    userId: string,
    day: string,
  ): Promise<MealEntry[]> {
    const rows = await this.prisma.ritmoMealEntry.findMany({
      where: { userId, loggedOn: toDateOnly(day) },
      orderBy: { createdAt: 'asc' },
      include: FOOD_NAME,
    });
    return rows.map(toMealEntry);
  }

  async listMealEntriesSince(
    userId: string,
    fromDay: string,
    mealType: MealType,
  ): Promise<MealEntry[]> {
    const rows = await this.prisma.ritmoMealEntry.findMany({
      where: { userId, mealType, loggedOn: { gte: toDateOnly(fromDay) } },
      orderBy: [{ loggedOn: 'asc' }, { createdAt: 'asc' }],
      include: FOOD_NAME,
    });
    return rows.map(toMealEntry);
  }

  async sumIntakeByDay(userId: string, day: string): Promise<DayIntakeTotals> {
    const agg = await this.prisma.ritmoMealEntry.aggregate({
      where: { userId, loggedOn: toDateOnly(day) },
      _sum: { kcal: true, proteinG: true, carbsG: true, fatG: true },
    });
    return {
      kcal: agg._sum.kcal ?? 0,
      proteinG: num(agg._sum.proteinG) ?? 0,
      carbsG: num(agg._sum.carbsG) ?? 0,
      fatG: num(agg._sum.fatG) ?? 0,
    };
  }

  async findDailyLog(userId: string, day: string): Promise<DailyLog | null> {
    const row = await this.prisma.ritmoDailyLog.findUnique({
      where: { userId_logDate: { userId, logDate: toDateOnly(day) } },
    });
    return row ? toDailyLog(row) : null;
  }

  async upsertDailyLog(
    userId: string,
    day: string,
    patch: DailyLogPatch,
  ): Promise<DailyLog> {
    const row = await this.prisma.ritmoDailyLog.upsert({
      where: { userId_logDate: { userId, logDate: toDateOnly(day) } },
      update: patch,
      create: { userId, logDate: toDateOnly(day), ...patch },
    });
    return toDailyLog(row);
  }

  async listDailyLogsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<DailyLog[]> {
    const rows = await this.prisma.ritmoDailyLog.findMany({
      where: {
        userId,
        logDate: { gte: toDateOnly(from), lte: toDateOnly(to) },
      },
      orderBy: { logDate: 'asc' },
    });
    return rows.map(toDailyLog);
  }

  async mealCountsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<DayMealCount[]> {
    const rows = await this.prisma.ritmoMealEntry.groupBy({
      by: ['loggedOn', 'mealType'],
      where: {
        userId,
        loggedOn: { gte: toDateOnly(from), lte: toDateOnly(to) },
      },
    });
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const day = toDay(r.loggedOn);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, mealsLogged]) => ({ day, mealsLogged }));
  }
}
