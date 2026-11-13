import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { Meal } from '../../domain/services/menu';
import type { BrioMenuRepositoryPort } from '../../application/ports/menu.port';
import { toDateOnly, toDay } from './brio.mapper';

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
}
