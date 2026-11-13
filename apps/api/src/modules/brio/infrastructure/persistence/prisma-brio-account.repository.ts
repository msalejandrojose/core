import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  BrioAccountExport,
  BrioAccountRepositoryPort,
} from '../../application/ports/brio-account-repository.port';

@Injectable()
export class PrismaBrioAccountRepository implements BrioAccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async exportAll(userId: string): Promise<BrioAccountExport | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) return null;
    const byUser = { where: { userId } };
    const [
      profile,
      measurements,
      activityTypes,
      sessions,
      foods,
      meals,
      logs,
      exercises,
      heartConfig,
      performanceMeasurements,
      plans,
      plannedSessions,
    ] = await Promise.all([
      this.prisma.brioProfile.findUnique(byUser),
      this.prisma.brioBodyMeasurement.findMany(byUser),
      this.prisma.brioActivityType.findMany({
        where: { ownerUserId: userId },
      }),
      this.prisma.brioActivitySession.findMany({
        ...byUser,
        include: { strengthSets: true },
      }),
      this.prisma.brioFood.findMany({
        where: { ownerUserId: userId },
        include: { servings: true },
      }),
      this.prisma.brioMealEntry.findMany(byUser),
      this.prisma.brioDailyLog.findMany(byUser),
      this.prisma.brioExercise.findMany({
        where: { ownerUserId: userId },
        include: { muscles: true },
      }),
      this.prisma.brioHeartConfig.findUnique(byUser),
      this.prisma.brioPerformanceMeasurement.findMany(byUser),
      this.prisma.brioPlan.findMany(byUser),
      this.prisma.brioPlannedSession.findMany(byUser),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      account: user,
      profile,
      measurements,
      activityTypes,
      sessions,
      foods,
      meals,
      dailyLogs: logs,
      exercises,
      heartConfig,
      performanceMeasurements,
      plans,
      plannedSessions,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    // Todas las relaciones con User son Cascade o SetNull, así que basta con
    // borrar el usuario. deleteMany para que repetir la llamada no falle.
    await this.prisma.user.deleteMany({ where: { id: userId } });
  }
}
