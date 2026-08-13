import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateLapTimeData,
  LapTimeRepositoryPort,
} from '../../application/ports/lap-time-repository.port';
import {
  LapTime,
  LeaderboardEntry,
} from '../../domain/entities/lap-time.entity';
import { toLapTimeDomain } from '../mappers/lap-time.mapper';

interface LeaderboardRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  durationMs: number;
  achievedAt: Date;
}

// Nombre visible en el ranking. Sin nombre y apellidos se cae al email; el
// leaderboard es de la Fase 0, cuando todavía no hay perfil ni alias.
function displayNameOf(row: LeaderboardRow): string {
  const full = [row.firstName, row.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .trim();
  return full === '' ? row.email : full;
}

@Injectable()
export class PrismaLapTimeRepository implements LapTimeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLapTimeData): Promise<LapTime> {
    const row = await this.prisma.lapTime.create({
      data: {
        userId: data.userId,
        trackId: data.trackId,
        durationMs: data.durationMs,
        splitsMs: data.splitsMs,
        clientVersion: data.clientVersion,
      },
    });
    return toLapTimeDomain(row);
  }

  async findById(id: string): Promise<LapTime | null> {
    const row = await this.prisma.lapTime.findUnique({ where: { id } });
    return row === null ? null : toLapTimeDomain(row);
  }

  async invalidate(id: string): Promise<LapTime> {
    const row = await this.prisma.lapTime.update({
      where: { id },
      data: { invalidatedAt: new Date() },
    });
    return toLapTimeDomain(row);
  }

  async findPersonalBest(
    userId: string,
    trackId: string,
  ): Promise<LapTime | null> {
    const row = await this.prisma.lapTime.findFirst({
      where: { userId, trackId, invalidatedAt: null },
      orderBy: [{ durationMs: 'asc' }, { createdAt: 'asc' }],
    });
    return row === null ? null : toLapTimeDomain(row);
  }

  async findLastAttemptAt(userId: string): Promise<Date | null> {
    const row = await this.prisma.lapTime.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }

  /**
   * Top del circuito con un jugador por fila.
   *
   * Va en SQL a mano y no con el query builder porque "el mejor tiempo de cada
   * jugador" es un group-by con desempate, y Prisma no sabe expresar el
   * `createdAt` DE la fila que gana el mínimo: hay que volver a buscarla.
   *
   * Sin window functions a propósito, aunque MySQL 8 las tenga: esta forma
   * funciona igual en MariaDB, que es el adaptador que usa el runtime.
   */
  async leaderboard(
    trackId: string,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const rows = await this.prisma.$queryRaw<LeaderboardRow[]>`
      SELECT
        b.user_id                                     AS userId,
        u.email                                       AS email,
        u.first_name                                  AS firstName,
        u.last_name                                   AS lastName,
        b.best                                        AS durationMs,
        (SELECT MIN(x.created_at)
           FROM racing_lap_time x
          WHERE x.track_id = b.track_id
            AND x.user_id  = b.user_id
            AND x.duration_ms = b.best
            AND x.invalidated_at IS NULL)             AS achievedAt
      FROM (
        SELECT track_id, user_id, MIN(duration_ms) AS best
          FROM racing_lap_time
         WHERE track_id = ${trackId}
           AND invalidated_at IS NULL
         GROUP BY track_id, user_id
      ) b
      JOIN user u ON u.id = b.user_id
      ORDER BY b.best ASC, achievedAt ASC
      LIMIT ${limit}
    `;

    return rows.map(
      (row, index) =>
        new LeaderboardEntry(
          index + 1,
          row.userId,
          displayNameOf(row),
          Number(row.durationMs),
          row.achievedAt,
        ),
    );
  }

  /**
   * Posición del jugador contando JUGADORES por delante, no filas: si alguien
   * ha corrido cien veces sigue ocupando un solo puesto.
   */
  async positionOf(trackId: string, userId: string): Promise<number | null> {
    const best = await this.prisma.lapTime.aggregate({
      where: { trackId, userId, invalidatedAt: null },
      _min: { durationMs: true },
    });

    const mine = best._min.durationMs;
    if (mine === null) return null;

    const rows = await this.prisma.$queryRaw<{ ahead: bigint }[]>`
      SELECT COUNT(*) AS ahead FROM (
        SELECT user_id, MIN(duration_ms) AS best
          FROM racing_lap_time
         WHERE track_id = ${trackId}
           AND invalidated_at IS NULL
         GROUP BY user_id
        HAVING best < ${mine}
      ) faster
    `;

    return Number(rows[0]?.ahead ?? 0) + 1;
  }
}
