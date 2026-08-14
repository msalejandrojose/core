import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { GrandPrixAttemptRepositoryPort } from '../../application/ports/grand-prix-attempt-repository.port';
import { GrandPrixAttempt } from '../../domain/entities/grand-prix-attempt.entity';
import { GrandPrixLeaderboardEntry } from '../../domain/entities/grand-prix-leaderboard-entry.entity';
import { toGrandPrixAttemptDomain } from '../mappers/grand-prix-attempt.mapper';

interface LeaderboardRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  totalDurationMs: number;
  completedAt: Date;
}

function displayNameOf(row: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const full = [row.firstName, row.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .trim();
  return full === '' ? row.email : full;
}

const WITH_RESULTS = {
  results: { orderBy: { completedAt: 'asc' as const } },
};

@Injectable()
export class PrismaGrandPrixAttemptRepository implements GrandPrixAttemptRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<GrandPrixAttempt | null> {
    const row = await this.prisma.racingGrandPrixAttempt.findUnique({
      where: { id },
      include: WITH_RESULTS,
    });
    return row === null ? null : toGrandPrixAttemptDomain(row);
  }

  async findInProgress(
    userId: string,
    grandPrixId: string,
  ): Promise<GrandPrixAttempt | null> {
    const row = await this.prisma.racingGrandPrixAttempt.findFirst({
      where: { userId, grandPrixId, status: 'IN_PROGRESS' },
      include: WITH_RESULTS,
    });
    return row === null ? null : toGrandPrixAttemptDomain(row);
  }

  async start(userId: string, grandPrixId: string): Promise<GrandPrixAttempt> {
    const row = await this.prisma.racingGrandPrixAttempt.create({
      data: { userId, grandPrixId },
      include: WITH_RESULTS,
    });
    return toGrandPrixAttemptDomain(row);
  }

  async addStageResult(
    attemptId: string,
    trackId: string,
    durationMs: number,
  ): Promise<GrandPrixAttempt> {
    await this.prisma.racingGrandPrixStageResult.create({
      data: { attemptId, trackId, durationMs },
    });
    const row = await this.prisma.racingGrandPrixAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: WITH_RESULTS,
    });
    return toGrandPrixAttemptDomain(row);
  }

  async complete(
    attemptId: string,
    totalDurationMs: number,
  ): Promise<GrandPrixAttempt> {
    const row = await this.prisma.racingGrandPrixAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalDurationMs,
      },
      include: WITH_RESULTS,
    });
    return toGrandPrixAttemptDomain(row);
  }

  /**
   * Top del Grand Prix con un jugador por fila: su mejor intento COMPLETED.
   * Mismo motivo que `PrismaLapTimeRepository.leaderboard` para ir en SQL a
   * mano — "el mejor total de cada jugador" es un group-by con desempate por
   * fecha, y hay que volver a buscar la fila que gana el mínimo.
   */
  async leaderboard(
    grandPrixId: string,
    limit: number,
  ): Promise<GrandPrixLeaderboardEntry[]> {
    const rows = await this.prisma.$queryRaw<LeaderboardRow[]>`
      SELECT
        b.user_id                                     AS userId,
        u.email                                       AS email,
        u.first_name                                  AS firstName,
        u.last_name                                   AS lastName,
        b.best                                        AS totalDurationMs,
        (SELECT MIN(x.completed_at)
           FROM racing_grand_prix_attempt x
          WHERE x.grand_prix_id = b.grand_prix_id
            AND x.user_id       = b.user_id
            AND x.status        = 'COMPLETED'
            AND x.total_duration_ms = b.best)          AS completedAt
      FROM (
        SELECT grand_prix_id, user_id, MIN(total_duration_ms) AS best
          FROM racing_grand_prix_attempt
         WHERE grand_prix_id = ${grandPrixId}
           AND status = 'COMPLETED'
         GROUP BY grand_prix_id, user_id
      ) b
      JOIN user u ON u.id = b.user_id
      ORDER BY b.best ASC, completedAt ASC
      LIMIT ${limit}
    `;

    return rows.map(
      (row, index) =>
        new GrandPrixLeaderboardEntry(
          index + 1,
          row.userId,
          displayNameOf(row),
          Number(row.totalDurationMs),
          row.completedAt,
        ),
    );
  }

  /**
   * Posición del jugador contando JUGADORES por delante, no intentos. Mismo
   * patrón que `PrismaLapTimeRepository.positionOf`.
   */
  async positionOf(
    grandPrixId: string,
    userId: string,
  ): Promise<number | null> {
    const best = await this.prisma.racingGrandPrixAttempt.aggregate({
      where: { grandPrixId, userId, status: 'COMPLETED' },
      _min: { totalDurationMs: true },
    });

    const mine = best._min.totalDurationMs;
    if (mine === null) return null;

    const rows = await this.prisma.$queryRaw<{ ahead: bigint }[]>`
      SELECT COUNT(*) AS ahead FROM (
        SELECT user_id, MIN(total_duration_ms) AS best
          FROM racing_grand_prix_attempt
         WHERE grand_prix_id = ${grandPrixId}
           AND status = 'COMPLETED'
         GROUP BY user_id
        HAVING best < ${mine}
      ) faster
    `;

    return Number(rows[0]?.ahead ?? 0) + 1;
  }
}
