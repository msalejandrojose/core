import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RacingBotRepositoryPort } from '../../application/ports/racing-bot-repository.port';

@Injectable()
export class PrismaRacingBotRepository implements RacingBotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // El pool es un puñado de cuentas (ver seed-racing-bots.ts) — se trae
  // entero y se baraja en memoria en vez de pelear con un ORDER BY RAND()
  // no portable entre motores.
  async pickBots(count: number, excludeUserIds: string[]): Promise<string[]> {
    const available = await this.prisma.racingBotAccount.findMany({
      where: { userId: { notIn: excludeUserIds } },
      select: { userId: true },
    });
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((row) => row.userId);
  }
}
