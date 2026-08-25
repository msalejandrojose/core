import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminLapTimeListEntry,
  AdminListLapTimesOptions,
  AdminTrackPopularityEntry,
  AdminUserTrackSummary,
  CreateLapTimeData,
  LapTimeRepositoryPort,
  OnlineRaceGhostCandidate,
  OnlineRaceGhostCandidates,
} from '../../application/ports/lap-time-repository.port';
import {
  LapTime,
  LeaderboardEntry,
} from '../../domain/entities/lap-time.entity';
import {
  toGhostSnapshots,
  toLapTimeDomain,
  toSplits,
} from '../mappers/lap-time.mapper';

interface LeaderboardRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  durationMs: number;
  achievedAt: Date;
}

interface GhostNeighborRow {
  userId: string;
  durationMs: number | bigint;
  ghostSnapshots: unknown;
}

interface TrackPopularityRow {
  trackId: string;
  trackSlug: string;
  trackName: string;
  isActive: number | boolean;
  totalLaps: bigint;
  distinctPlayers: bigint;
  lastPlayedAt: Date | null;
  lapsLast30d: bigint;
  lapsPrev30d: bigint;
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
        ghostSnapshots: (data.ghostSnapshots ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        seasonId: data.seasonId ?? undefined,
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
    seasonId?: string | null,
  ): Promise<LeaderboardEntry[]> {
    // `null`/omitido = sin acotar (histórico completo, el comportamiento de
    // siempre); un id concreto acota a esa temporada (TASK-227). No es
    // "season_id IS NULL" — eso dejaría fuera justo los intentos de antes de
    // que existieran las temporadas.
    const seasonFilter = seasonId
      ? Prisma.sql`AND season_id = ${seasonId}`
      : Prisma.empty;

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
            AND x.invalidated_at IS NULL
            ${seasonFilter})                          AS achievedAt
      FROM (
        SELECT track_id, user_id, MIN(duration_ms) AS best
          FROM racing_lap_time
         WHERE track_id = ${trackId}
           AND invalidated_at IS NULL
           ${seasonFilter}
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
   * Igual que `leaderboard()` pero acotado a `userIds` (TASK-290) en vez de
   * a un `LIMIT`: mismo group-by "mejor tiempo por jugador", filtrado por
   * `user_id IN (...)`. Vacío sin tocar la BBDD si `userIds` está vacío — un
   * `IN ()` es sintaxis inválida en MySQL, y de todas formas la respuesta ya
   * se sabe de antemano.
   */
  async leaderboardAmongUsers(
    trackId: string,
    userIds: string[],
    seasonId?: string | null,
  ): Promise<LeaderboardEntry[]> {
    if (userIds.length === 0) return [];

    const seasonFilter = seasonId
      ? Prisma.sql`AND season_id = ${seasonId}`
      : Prisma.empty;
    const userIdsSql = Prisma.join(userIds);

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
            AND x.invalidated_at IS NULL
            ${seasonFilter})                          AS achievedAt
      FROM (
        SELECT track_id, user_id, MIN(duration_ms) AS best
          FROM racing_lap_time
         WHERE track_id = ${trackId}
           AND invalidated_at IS NULL
           AND user_id IN (${userIdsSql})
           ${seasonFilter}
         GROUP BY track_id, user_id
      ) b
      JOIN user u ON u.id = b.user_id
      ORDER BY b.best ASC, achievedAt ASC
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
  async positionOf(
    trackId: string,
    userId: string,
    seasonId?: string | null,
  ): Promise<number | null> {
    const best = await this.prisma.lapTime.aggregate({
      where: {
        trackId,
        userId,
        invalidatedAt: null,
        ...(seasonId ? { seasonId } : {}),
      },
      _min: { durationMs: true },
    });

    const mine = best._min.durationMs;
    if (mine === null) return null;

    const seasonFilter = seasonId
      ? Prisma.sql`AND season_id = ${seasonId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<{ ahead: bigint }[]>`
      SELECT COUNT(*) AS ahead FROM (
        SELECT user_id, MIN(duration_ms) AS best
          FROM racing_lap_time
         WHERE track_id = ${trackId}
           AND invalidated_at IS NULL
           ${seasonFilter}
         GROUP BY user_id
        HAVING best < ${mine}
      ) faster
    `;

    return Number(rows[0]?.ahead ?? 0) + 1;
  }

  /**
   * Vecino inmediato mejor/peor CON fantasma grabado (TASK-284): une la
   * misma subconsulta "mejor tiempo por jugador" de `leaderboard`/`positionOf`
   * con la fila exacta que llevó ese tiempo, para poder exigir que esa fila
   * tenga `ghost_snapshots`. Sin window functions, mismo motivo que el resto
   * del fichero: MariaDB en producción.
   */
  async findGhostRivalCandidates(
    trackId: string,
    userId: string,
    durationMs: number,
  ): Promise<OnlineRaceGhostCandidates> {
    const [target, threat] = await Promise.all([
      this.nearestGhostNeighbor(trackId, userId, durationMs, 'better'),
      this.nearestGhostNeighbor(trackId, userId, durationMs, 'worse'),
    ]);
    return { target, threat };
  }

  private async nearestGhostNeighbor(
    trackId: string,
    userId: string,
    durationMs: number,
    side: 'better' | 'worse',
  ): Promise<OnlineRaceGhostCandidate | null> {
    const comparator = side === 'better' ? Prisma.sql`<` : Prisma.sql`>`;
    const order = side === 'better' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    const rows = await this.prisma.$queryRaw<GhostNeighborRow[]>`
      SELECT b.user_id AS userId, b.best AS durationMs, g.ghost_snapshots AS ghostSnapshots
        FROM (
          SELECT track_id, user_id, MIN(duration_ms) AS best
            FROM racing_lap_time
           WHERE track_id = ${trackId}
             AND user_id != ${userId}
             AND invalidated_at IS NULL
           GROUP BY track_id, user_id
          HAVING best ${comparator} ${durationMs}
        ) b
        JOIN racing_lap_time g
          ON g.track_id = b.track_id
         AND g.user_id = b.user_id
         AND g.duration_ms = b.best
         AND g.invalidated_at IS NULL
       WHERE g.ghost_snapshots IS NOT NULL
       ORDER BY b.best ${order}, g.created_at DESC
       LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    const snapshots = toGhostSnapshots(row.ghostSnapshots);
    if (!snapshots) return null;

    return {
      userId: row.userId,
      durationMs: Number(row.durationMs),
      ghostSnapshots: snapshots,
    };
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

  /**
   * Popularidad por circuito para el reporte del backoffice (TASK-240).
   * `LEFT JOIN` desde `racing_track`, no desde `racing_lap_time`: un
   * circuito sin ningún intento tiene que aparecer igualmente, con todo en
   * cero — es justo el caso "se abandonó" (o nunca se jugó) que el reporte
   * quiere mostrar. Cuenta TODOS los intentos, válidos o anulados: mide
   * actividad de juego, no validez de leaderboard (eso ya lo hace
   * `listAllAdmin`/`leaderboard`).
   */
  async trackPopularity(): Promise<AdminTrackPopularityEntry[]> {
    const now = new Date();
    const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<TrackPopularityRow[]>`
      SELECT
        t.id                                                     AS trackId,
        t.slug                                                   AS trackSlug,
        t.name                                                   AS trackName,
        t.is_active                                              AS isActive,
        COUNT(lt.id)                                             AS totalLaps,
        COUNT(DISTINCT lt.user_id)                                AS distinctPlayers,
        MAX(lt.created_at)                                       AS lastPlayedAt,
        SUM(CASE WHEN lt.created_at >= ${last30Start} THEN 1 ELSE 0 END) AS lapsLast30d,
        SUM(CASE WHEN lt.created_at >= ${prev30Start}
                  AND lt.created_at <  ${last30Start} THEN 1 ELSE 0 END) AS lapsPrev30d
      FROM racing_track t
      LEFT JOIN racing_lap_time lt ON lt.track_id = t.id
      GROUP BY t.id, t.slug, t.name, t.is_active
      ORDER BY totalLaps DESC, t.name ASC
    `;

    return rows.map((row) => ({
      trackId: row.trackId,
      trackSlug: row.trackSlug,
      trackName: row.trackName,
      isActive: Boolean(row.isActive),
      totalLaps: Number(row.totalLaps),
      distinctPlayers: Number(row.distinctPlayers),
      lastPlayedAt: row.lastPlayedAt,
      lapsLast30d: Number(row.lapsLast30d),
      lapsPrev30d: Number(row.lapsPrev30d),
    }));
  }
}
