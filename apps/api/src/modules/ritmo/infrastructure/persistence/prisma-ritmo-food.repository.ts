import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { Food } from '../../domain/entities/food.entity';
import type {
  CreateFoodData,
  RitmoFoodRepositoryPort,
} from '../../application/ports/ritmo-food-repository.port';
import { toFood } from './ritmo.mapper';

const SERVINGS = {
  servings: { orderBy: { isDefault: 'desc' } },
} as const;

@Injectable()
export class PrismaRitmoFoodRepository implements RitmoFoodRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Visible = catálogo compartido + alimentos propios del usuario. */
  private visibleTo(userId: string) {
    return { OR: [{ ownerUserId: null }, { ownerUserId: userId }] };
  }

  async search(userId: string, query: string, limit: number): Promise<Food[]> {
    const rows = await this.prisma.ritmoFood.findMany({
      where: {
        AND: [
          this.visibleTo(userId),
          { OR: [{ name: { contains: query } }, { brand: { contains: query } }] },
        ],
      },
      // Los verificados primero: ante "arroz", antes el del catálogo revisado
      // que la receta que alguien subió a medias.
      orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      take: limit,
      include: SERVINGS,
    });
    return rows.map(toFood);
  }

  async findByBarcode(userId: string, barcode: string): Promise<Food | null> {
    const row = await this.prisma.ritmoFood.findFirst({
      where: { barcode, ...this.visibleTo(userId) },
      include: SERVINGS,
    });
    return row ? toFood(row) : null;
  }

  async findVisibleTo(id: string, userId: string): Promise<Food | null> {
    const row = await this.prisma.ritmoFood.findFirst({
      where: { id, ...this.visibleTo(userId) },
      include: SERVINGS,
    });
    return row ? toFood(row) : null;
  }

  async create(data: CreateFoodData): Promise<Food> {
    const row = await this.prisma.ritmoFood.create({
      data: {
        name: data.name,
        brand: data.brand,
        barcode: data.barcode,
        source: 'USER',
        ownerUserId: data.ownerUserId,
        isLiquid: data.isLiquid,
        kcalPer100: data.kcalPer100,
        proteinPer100G: data.proteinPer100G,
        carbsPer100G: data.carbsPer100G,
        fatPer100G: data.fatPer100G,
        servings: { create: data.servings },
      },
      include: SERVINGS,
    });
    return toFood(row);
  }
}
