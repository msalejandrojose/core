import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateLiveRaceData,
  LiveRaceRepositoryPort,
} from '../../application/ports/live-race-repository.port';
import { LiveRace } from '../../domain/entities/live-race.entity';
import { toLiveRaceDomain } from '../mappers/live-race.mapper';

@Injectable()
export class PrismaLiveRaceRepository implements LiveRaceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLiveRaceData): Promise<LiveRace> {
    const row = await this.prisma.racingLiveRace.create({
      data: {
        trackId: data.trackId,
        status: data.status,
        finishedAt: data.finishedAt,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            durationMs: p.durationMs,
            position: p.position,
            deltaMs: p.deltaMs,
            disconnected: p.disconnected,
          })),
        },
      },
      include: { participants: { orderBy: { position: 'asc' } } },
    });
    return toLiveRaceDomain(row);
  }
}
