import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import type {
  CreateSessionData,
  RitmoActivityRepositoryPort,
} from '../../application/ports/ritmo-activity-repository.port';
import { toActivityType, toDateOnly, toSession } from './ritmo.mapper';

@Injectable()
export class PrismaRitmoActivityRepository implements RitmoActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Visible = catálogo global (`ownerUserId` null) + las propias del usuario. */
  private visibleTo(userId: string) {
    return {
      isArchived: false,
      OR: [{ ownerUserId: null }, { ownerUserId: userId }],
    };
  }

  async listTypesVisibleTo(userId: string): Promise<ActivityType[]> {
    const rows = await this.prisma.ritmoActivityType.findMany({
      where: this.visibleTo(userId),
      orderBy: [{ name: 'asc' }],
    });
    return rows.map(toActivityType);
  }

  async findTypeVisibleTo(
    id: string,
    userId: string,
  ): Promise<ActivityType | null> {
    const row = await this.prisma.ritmoActivityType.findFirst({
      where: { id, ...this.visibleTo(userId) },
    });
    return row ? toActivityType(row) : null;
  }

  async createSession(data: CreateSessionData): Promise<ActivitySession> {
    const row = await this.prisma.ritmoActivitySession.create({
      data: { ...data, loggedOn: toDateOnly(data.loggedOn) },
      include: { activityType: { select: { name: true } } },
    });
    return toSession(row);
  }

  async findSession(
    id: string,
    userId: string,
  ): Promise<ActivitySession | null> {
    const row = await this.prisma.ritmoActivitySession.findFirst({
      where: { id, userId },
      include: { activityType: { select: { name: true } } },
    });
    return row ? toSession(row) : null;
  }

  async deleteSession(id: string, userId: string): Promise<boolean> {
    // Borrado condicionado por owner en el propio WHERE: no hace falta leer
    // antes para comprobar la propiedad.
    const { count } = await this.prisma.ritmoActivitySession.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  async listSessionsByDay(
    userId: string,
    day: string,
  ): Promise<ActivitySession[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: { userId, loggedOn: toDateOnly(day) },
      orderBy: { startedAt: 'asc' },
      include: { activityType: { select: { name: true } } },
    });
    return rows.map(toSession);
  }

  async sumKcalByDay(userId: string, day: string): Promise<number> {
    const agg = await this.prisma.ritmoActivitySession.aggregate({
      where: { userId, loggedOn: toDateOnly(day) },
      _sum: { kcalBurned: true },
    });
    return agg._sum.kcalBurned ?? 0;
  }
}
