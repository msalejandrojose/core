import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { Meal, PlannedMeal } from '../../domain/services/menu';
import type {
  BrioMenuRepositoryPort,
  NewPlannedMeal,
} from '../../application/ports/menu.port';
import { numReq, toDateOnly, toDay } from './brio.mapper';

@Injectable()
export class PrismaBrioMenuRepository implements BrioMenuRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async choicesBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<{ day: string; meal: Meal; dishCode: string }[]> {
    const rows = await this.prisma.brioMenuChoice.findMany({
      where: { userId, day: { gte: toDateOnly(from), lte: toDateOnly(to) } },
    });
    return rows.map((r) => ({
      day: toDay(r.day),
      meal: r.meal as Meal,
      dishCode: r.dishCode,
    }));
  }

  async saveChoice(
    userId: string,
    day: string,
    meal: Meal,
    dishCode: string,
  ): Promise<void> {
    const key = { userId, day: toDateOnly(day), meal };
    await this.prisma.brioMenuChoice.upsert({
      where: { userId_day_meal: key },
      update: { dishCode },
      create: { ...key, dishCode },
    });
  }

  async checkedItems(userId: string, weekStart: string): Promise<string[]> {
    const rows = await this.prisma.brioShoppingCheck.findMany({
      where: { userId, weekStart: toDateOnly(weekStart) },
      select: { itemCode: true },
    });
    return rows.map((r) => r.itemCode);
  }

  async setChecked(
    userId: string,
    weekStart: string,
    itemCode: string,
    checked: boolean,
  ): Promise<void> {
    const key = { userId, weekStart: toDateOnly(weekStart), itemCode };
    if (checked)
      await this.prisma.brioShoppingCheck.upsert({
        where: { userId_weekStart_itemCode: key },
        update: {},
        create: key,
      });
    else await this.prisma.brioShoppingCheck.deleteMany({ where: key });
  }

  async plannedBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<PlannedMeal[]> {
    const rows = await this.prisma.brioPlannedMeal.findMany({
      where: { userId, day: { gte: toDateOnly(from), lte: toDateOnly(to) } },
      orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toPlanned);
  }

  async addPlanned(userId: string, data: NewPlannedMeal): Promise<PlannedMeal> {
    const row = await this.prisma.brioPlannedMeal.create({
      data: {
        userId,
        day: toDateOnly(data.day),
        meal: data.meal,
        foodId: data.foodId,
        servingId: data.servingId,
        servingLabel: data.servingLabel,
        name: data.name.slice(0, 200),
        quantity: data.quantity,
        quantityG: data.quantityG,
        kcal: data.kcal,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
      },
    });
    return toPlanned(row);
  }

  async deletePlanned(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.brioPlannedMeal.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  async clearPlanned(userId: string, day: string, meal: Meal): Promise<number> {
    const { count } = await this.prisma.brioPlannedMeal.deleteMany({
      where: { userId, day: toDateOnly(day), meal },
    });
    return count;
  }
}

function toPlanned(r: {
  id: string;
  day: Date;
  meal: string;
  foodId: string | null;
  servingId: string | null;
  servingLabel: string | null;
  name: string;
  quantity: { toString(): string };
  quantityG: { toString(): string };
  kcal: number;
  proteinG: { toString(): string };
  carbsG: { toString(): string };
  fatG: { toString(): string };
}): PlannedMeal {
  return {
    id: r.id,
    day: toDay(r.day),
    meal: r.meal as Meal,
    foodId: r.foodId,
    servingId: r.servingId,
    servingLabel: r.servingLabel,
    name: r.name,
    quantity: numReq(r.quantity),
    quantityG: numReq(r.quantityG),
    kcal: r.kcal,
    proteinG: numReq(r.proteinG),
    carbsG: numReq(r.carbsG),
    fatG: numReq(r.fatG),
  };
}
