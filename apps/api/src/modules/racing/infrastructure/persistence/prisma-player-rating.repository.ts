import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListPlayerRatingsOptions,
  AdminPlayerRatingListEntry,
  PlayerRatingRepositoryPort,
  RatingUpdate,
} from '../../application/ports/player-rating-repository.port';

const DEFAULT_RATING = 1000;

// Igual que `displayNameOf` en `prisma-lap-time.repository.ts`/
// `prisma-friendship.repository.ts` — duplicado a propósito, cada
// repositorio ya repite este mismo patrón de tres líneas.
function displayNameOf(user: { email: string; firstName: string | null; lastName: string | null }): string {
  const full = [user.firstName, user.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .trim();
  return full === '' ? user.email : full;
}

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

  async listAllAdmin(
    opts: AdminListPlayerRatingsOptions,
  ): Promise<PaginatedResult<AdminPlayerRatingListEntry>> {
    const [rows, total] = await Promise.all([
      this.prisma.racingPlayerRating.findMany({
        orderBy: { rating: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.racingPlayerRating.count(),
    ]);

    return {
      items: rows.map((row) => ({
        userId: row.userId,
        userEmail: row.user.email,
        userDisplayName: displayNameOf(row.user),
        rating: row.rating,
      })),
      total,
    };
  }
}
