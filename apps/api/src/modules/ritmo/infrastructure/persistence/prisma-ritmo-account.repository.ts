import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  RitmoAccountExport,
  RitmoAccountRepositoryPort,
} from '../../application/ports/ritmo-account-repository.port';

@Injectable()
export class PrismaRitmoAccountRepository implements RitmoAccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async exportAll(userId: string): Promise<RitmoAccountExport | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) return null;
    const byUser = { where: { userId } };
    const [profile, measurements, activityTypes, sessions, foods, meals, logs] =
      await Promise.all([
        this.prisma.ritmoProfile.findUnique(byUser),
        this.prisma.ritmoBodyMeasurement.findMany(byUser),
        this.prisma.ritmoActivityType.findMany({
          where: { ownerUserId: userId },
        }),
        this.prisma.ritmoActivitySession.findMany(byUser),
        this.prisma.ritmoFood.findMany({
          where: { ownerUserId: userId },
          include: { servings: true },
        }),
        this.prisma.ritmoMealEntry.findMany(byUser),
        this.prisma.ritmoDailyLog.findMany(byUser),
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
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    // Todas las relaciones con User son Cascade o SetNull, así que basta con
    // borrar el usuario. deleteMany para que repetir la llamada no falle.
    await this.prisma.user.deleteMany({ where: { id: userId } });
  }
}
