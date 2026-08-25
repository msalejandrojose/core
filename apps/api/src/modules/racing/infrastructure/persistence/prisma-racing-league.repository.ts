import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RacingLeagueStanding as PrismaRacingLeagueStanding } from '../../../../generated/prisma/client';
import { RacingLeagueRepositoryPort } from '../../application/ports/racing-league-repository.port';
import {
  RacingLeagueStanding,
  RacingLeagueTier,
} from '../../domain/entities/racing-league-standing.entity';

function toDomain(row: PrismaRacingLeagueStanding): RacingLeagueStanding {
  return {
    userId: row.userId,
    seasonId: row.seasonId,
    tier: RacingLeagueTier[row.tier],
    points: row.points,
  };
}

@Injectable()
export class PrismaRacingLeagueRepository implements RacingLeagueRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findStanding(
    userId: string,
    seasonId: string,
  ): Promise<RacingLeagueStanding | null> {
    const row = await this.prisma.racingLeagueStanding.findUnique({
      where: { userId_seasonId: { userId, seasonId } },
    });
    return row === null ? null : toDomain(row);
  }

  async upsertStanding(
    userId: string,
    seasonId: string,
    data: { points: number; tier: RacingLeagueTier },
  ): Promise<RacingLeagueStanding> {
    const row = await this.prisma.racingLeagueStanding.upsert({
      where: { userId_seasonId: { userId, seasonId } },
      create: { userId, seasonId, points: data.points, tier: data.tier },
      update: { points: data.points, tier: data.tier },
    });
    return toDomain(row);
  }
}
