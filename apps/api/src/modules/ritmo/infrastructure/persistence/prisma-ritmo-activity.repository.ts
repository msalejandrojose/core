import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import type { StrengthSet } from '../../domain/entities/performance.entity';
import type {
  CreateSessionData,
  UpdateSessionData,
  RitmoActivityRepositoryPort,
  DaySessionStats,
} from '../../application/ports/ritmo-activity-repository.port';
import { toActivityType, toDateOnly, toDay, toSession } from './ritmo.mapper';

/** Lo que necesita `toSession`: nombre y disciplina del tipo, y las series. */
const SESSION_INCLUDE = {
  activityType: { select: { name: true, kind: true } },
  strengthSets: true,
} as const;

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
    const { sets, zoneSeconds, ...session } = data;
    const row = await this.prisma.ritmoActivitySession.create({
      data: {
        ...session,
        zoneSeconds: zoneSeconds ?? undefined,
        loggedOn: toDateOnly(data.loggedOn),
        strengthSets: {
          create: sets.map((s) => ({ ...s, userId: data.userId })),
        },
      },
      include: SESSION_INCLUDE,
    });
    return toSession(row);
  }

  async findSession(
    id: string,
    userId: string,
  ): Promise<ActivitySession | null> {
    const row = await this.prisma.ritmoActivitySession.findFirst({
      where: { id, userId },
      include: SESSION_INCLUDE,
    });
    return row ? toSession(row) : null;
  }

  async listSessions(
    userId: string,
    options: { beforeDay: string | null; limit: number },
  ): Promise<ActivitySession[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: {
        userId,
        ...(options.beforeDay
          ? { loggedOn: { lt: toDateOnly(options.beforeDay) } }
          : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: options.limit,
      include: SESSION_INCLUDE,
    });
    return rows.map(toSession);
  }

  async updateSession(
    id: string,
    userId: string,
    data: UpdateSessionData,
  ): Promise<boolean> {
    const { loggedOn, zoneSeconds, ...rest } = data;
    // Condicionado por owner en el WHERE, igual que el borrado.
    const { count } = await this.prisma.ritmoActivitySession.updateMany({
      where: { id, userId },
      data: {
        ...rest,
        ...(loggedOn ? { loggedOn: toDateOnly(loggedOn) } : {}),
        // En una columna JSON, `null` de JS no es NULL de SQL: hay que decirlo.
        ...(zoneSeconds === undefined
          ? {}
          : { zoneSeconds: zoneSeconds ?? Prisma.DbNull }),
      },
    });
    return count > 0;
  }

  async deleteSession(id: string, userId: string): Promise<boolean> {
    // Borrado condicionado por owner en el propio WHERE: no hace falta leer
    // antes para comprobar la propiedad.
    const { count } = await this.prisma.ritmoActivitySession.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  async replaceSets(
    sessionId: string,
    userId: string,
    sets: StrengthSet[],
  ): Promise<void> {
    // Borrar y volver a crear en una transacción: una edición nunca deja la
    // sesión con la mitad de las series.
    await this.prisma.$transaction([
      this.prisma.ritmoStrengthSet.deleteMany({ where: { sessionId, userId } }),
      this.prisma.ritmoStrengthSet.createMany({
        data: sets.map((s) => ({ ...s, sessionId, userId })),
      }),
    ]);
  }

  async listSessionsByDay(
    userId: string,
    day: string,
  ): Promise<ActivitySession[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: { userId, loggedOn: toDateOnly(day) },
      orderBy: { startedAt: 'asc' },
      include: SESSION_INCLUDE,
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

  async sessionStatsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<DaySessionStats[]> {
    const rows = await this.prisma.ritmoActivitySession.groupBy({
      by: ['loggedOn'],
      where: {
        userId,
        loggedOn: { gte: toDateOnly(from), lte: toDateOnly(to) },
      },
      _count: { _all: true },
      _sum: { durationSec: true },
      orderBy: { loggedOn: 'asc' },
    });
    return rows.map((r) => ({
      day: toDay(r.loggedOn),
      sessions: r._count._all,
      minutes: Math.round((r._sum.durationSec ?? 0) / 60),
    }));
  }
}
