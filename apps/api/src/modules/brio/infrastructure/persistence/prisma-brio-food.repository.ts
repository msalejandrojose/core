import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { Food } from '../../domain/entities/food.entity';
import type { OffFood } from '../../domain/services/open-food-facts';
import type {
  CreateFoodData,
  BrioFoodRepositoryPort,
} from '../../application/ports/brio-food-repository.port';
import { toFood } from './brio.mapper';

const SERVINGS = {
  servings: { orderBy: { isDefault: 'desc' } },
} as const;

@Injectable()
export class PrismaBrioFoodRepository implements BrioFoodRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Visible = catálogo compartido + alimentos propios del usuario. */
  private visibleTo(userId: string) {
    return { OR: [{ ownerUserId: null }, { ownerUserId: userId }] };
  }

  async search(userId: string, query: string, limit: number): Promise<Food[]> {
    const rows = await this.prisma.brioFood.findMany({
      where: {
        AND: [
          this.visibleTo(userId),
          {
            OR: [{ name: { contains: query } }, { brand: { contains: query } }],
          },
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
    const row = await this.prisma.brioFood.findFirst({
      where: { barcode, ...this.visibleTo(userId) },
      include: SERVINGS,
    });
    return row ? toFood(row) : null;
  }

  async findVisibleTo(id: string, userId: string): Promise<Food | null> {
    const row = await this.prisma.brioFood.findFirst({
      where: { id, ...this.visibleTo(userId) },
      include: SERVINGS,
    });
    return row ? toFood(row) : null;
  }

  async findGlobalByNames(names: readonly string[]): Promise<Food[]> {
    const rows = await this.prisma.brioFood.findMany({
      where: { ownerUserId: null, name: { in: [...names] } },
      include: SERVINGS,
    });
    const order = new Map(names.map((n, i) => [n, i]));
    return rows
      .sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0))
      .map(toFood);
  }

  async create(data: CreateFoodData): Promise<Food> {
    const row = await this.prisma.brioFood.create({
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

  async createFromOpenFoodFacts(
    barcode: string,
    data: OffFood,
  ): Promise<Food | null> {
    const { servings, ...food } = data;
    try {
      const row = await this.prisma.brioFood.create({
        data: {
          ...food,
          barcode,
          source: 'OPEN_FOOD_FACTS',
          externalId: barcode,
          ownerUserId: null,
          isVerified: false,
          servings: { create: servings },
        },
        include: SERVINGS,
      });
      return toFood(row);
    } catch (e) {
      // Código ya usado: lo importó otra petición a la vez o es un alimento
      // propio de otro usuario (que este no puede ver).
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        return null;
      throw e;
    }
  }
}
