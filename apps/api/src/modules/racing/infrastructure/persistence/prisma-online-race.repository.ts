import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateOnlineRaceData,
  OnlineRaceRepositoryPort,
} from '../../application/ports/online-race-repository.port';
import { OnlineRace } from '../../domain/entities/online-race.entity';
import { toOnlineRaceDomain } from '../mappers/online-race.mapper';

const WITH_PARTICIPANTS = {
  participants: { orderBy: { position: 'asc' as const } },
};

@Injectable()
export class PrismaOnlineRaceRepository implements OnlineRaceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOnlineRaceData): Promise<OnlineRace> {
    const row = await this.prisma.racingOnlineRace.create({
      data: {
        userId: data.userId,
        trackId: data.trackId,
        participants: {
          create: data.participants.map((p) => ({
            role: p.role,
            userId: p.userId,
            durationMs: p.durationMs,
            position: p.position,
            deltaMs: p.deltaMs,
          })),
        },
      },
      include: WITH_PARTICIPANTS,
    });
    return toOnlineRaceDomain(row);
  }

  async findById(id: string): Promise<OnlineRace | null> {
    const row = await this.prisma.racingOnlineRace.findUnique({
      where: { id },
      include: WITH_PARTICIPANTS,
    });
    return row === null ? null : toOnlineRaceDomain(row);
  }
}
