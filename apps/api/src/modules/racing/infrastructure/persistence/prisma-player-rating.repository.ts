import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  PlayerRatingRepositoryPort,
  RatingUpdate,
} from '../../application/ports/player-rating-repository.port';

const DEFAULT_RATING = 1000;

@Injectable()
export class PrismaPlayerRatingRepository implements PlayerRatingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getRating(userId: string): Promise<number> {
    const row = await this.prisma.racingPlayerRating.findUnique({
      where: { userId },
      select: { rating: true },
    });
    return row?.rating ?? DEFAULT_RATING;
  }

  async getRatings(userIds: string[]): Promise<Map<string, number>> {
    const rows = await this.prisma.racingPlayerRating.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, rating: true },
    });
    const byUserId = new Map(rows.map((r) => [r.userId, r.rating]));
    return new Map(userIds.map((id) => [id, byUserId.get(id) ?? DEFAULT_RATING]));
  }

  // Cada jugador ya trae su rating FINAL (calculado por `computeRatingChanges`)
  // — un upsert por fila, no un increment: si todavía no existía, se crea
  // con ese valor directamente, sin pasar por el 1000 por defecto primero.
  async applyChanges(changes: RatingUpdate[]): Promise<void> {
    await this.prisma.$transaction(
      changes.map((change) =>
        this.prisma.racingPlayerRating.upsert({
          where: { userId: change.userId },
          create: { userId: change.userId, rating: change.rating },
          update: { rating: change.rating },
        }),
      ),
    );
  }
}
