import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminLapTimeListEntry,
  AdminListLapTimesOptions,
  AdminUserTrackSummary,
  CreateLapTimeData,
  LapTimeRepositoryPort,
} from '../../application/ports/lap-time-repository.port';
import {
  LapTime,
  LeaderboardEntry,
} from '../../domain/entities/lap-time.entity';
import { toLapTimeDomain, toSplits } from '../mappers/lap-time.mapper';

interface LeaderboardRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  durationMs: number;
  achievedAt: Date;
}

interface AdminLapTimeRow {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  trackId: string;
  trackSlug: string;
  trackName: string;
  durationMs: number;
  splitsMs: unknown;
  clientVersion: string;
  createdAt: Date;
  invalidatedAt: Date | null;
  isPersonalBest: number | boolean;
}

// Nombre visible de cara al backoffice/leaderboard. Sin nombre y apellidos se
// cae al email; todavía no hay perfil ni alias de jugador.
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

  /**
   * Todos los intentos (válidos e inválidos) con circuito y jugador ya
   * resueltos, para el backoffice (TASK-246). `isPersonalBest` se calcula por
   * fila con una subconsulta correlacionada — acotada al tamaño de página, no
   * a toda la tabla — porque el query builder de Prisma no puede expresar
   * "el mínimo de MI (usuario, circuito)" fila a fila.
   */
  async listAllAdmin(
    opts: AdminListLapTimesOptions,
  ): Promise<PaginatedResult<AdminLapTimeListEntry>> {
    const conditions: Prisma.Sql[] = [];
    if (opts.trackId)
      conditions.push(Prisma.sql`lt.track_id = ${opts.trackId}`);
    if (opts.userId) conditions.push(Prisma.sql`lt.user_id = ${opts.userId}`);

    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<AdminLapTimeRow[]>`
      SELECT
        lt.id                                          AS id,
        lt.user_id                                      AS userId,
        u.email                                         AS email,
        u.first_name                                    AS firstName,
        u.last_name                                     AS lastName,
        lt.track_id                                     AS trackId,
        t.slug                                          AS trackSlug,
        t.name                                          AS trackName,
        lt.duration_ms                                  AS durationMs,
        lt.splits_ms                                    AS splitsMs,
        lt.client_version                               AS clientVersion,
        lt.created_at                                   AS createdAt,
        lt.invalidated_at                               AS invalidatedAt,
        (lt.invalidated_at IS NULL AND lt.duration_ms = (
          SELECT MIN(x.duration_ms) FROM racing_lap_time x
           WHERE x.user_id = lt.user_id
             AND x.track_id = lt.track_id
             AND x.invalidated_at IS NULL
        ))                                               AS isPersonalBest
      FROM racing_lap_time lt
      JOIN user u ON u.id = lt.user_id
      JOIN racing_track t ON t.id = lt.track_id
      ${where}
      ORDER BY lt.created_at DESC
      LIMIT ${opts.limit} OFFSET ${(opts.page - 1) * opts.limit}
    `;

    const countRows = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM racing_lap_time lt ${where}
    `;

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userEmail: row.email,
        userDisplayName: displayNameOf(row),
        trackId: row.trackId,
        trackSlug: row.trackSlug,
        trackName: row.trackName,
        durationMs: Number(row.durationMs),
        splitsMs: toSplits(row.splitsMs),
        clientVersion: row.clientVersion,
        createdAt: row.createdAt,
        invalidatedAt: row.invalidatedAt,
        isPersonalBest: Boolean(row.isPersonalBest),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  /**
   * Resumen por circuito de un jugador, para su ficha (TASK-251). Dos
   * `groupBy` en vez de uno porque "cuántos intentos" cuenta TODOS y "mejor
   * tiempo" solo los válidos — un único `groupBy` con `_min` no puede aplicar
   * un `WHERE` distinto a cada agregado. Sin SQL crudo: acotado a los
   * circuitos de ESTE jugador, no hace falta la subconsulta correlacionada
   * que sí hacía falta en `listAllAdmin` (ahí el filtro es por fila, entre
   * jugadores distintos).
   */
  async summarizeForUserAdmin(
    userId: string,
  ): Promise<AdminUserTrackSummary[]> {
    const [totals, bests] = await Promise.all([
      this.prisma.lapTime.groupBy({
        by: ['trackId'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.lapTime.groupBy({
        by: ['trackId'],
        where: { userId, invalidatedAt: null },
        _min: { durationMs: true },
      }),
    ]);

    if (totals.length === 0) return [];

    const bestByTrack = new Map(
      bests.map((b) => [b.trackId, b._min.durationMs]),
    );

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: totals.map((t) => t.trackId) } },
      select: { id: true, slug: true, name: true },
    });
    const trackById = new Map(tracks.map((t) => [t.id, t]));

    return totals
      .map((t) => {
        const track = trackById.get(t.trackId);
        if (!track) return null;
        return {
          trackId: t.trackId,
          trackSlug: track.slug,
          trackName: track.name,
          attempts: t._count._all,
          bestDurationMs: bestByTrack.get(t.trackId) ?? null,
        };
      })
      .filter((row): row is AdminUserTrackSummary => row !== null)
      .sort((a, b) => a.trackName.localeCompare(b.trackName));
  }
}
