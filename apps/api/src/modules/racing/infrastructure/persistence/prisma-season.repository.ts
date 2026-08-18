import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateSeasonData,
  SeasonRepositoryPort,
} from '../../application/ports/season-repository.port';
import { Season } from '../../domain/entities/season.entity';

interface SeasonRow {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
}

function toDomain(row: SeasonRow): Season {
  return new Season(row.id, row.name, row.startsAt, row.endsAt);
}

@Injectable()
export class PrismaSeasonRepository implements SeasonRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSeasonData): Promise<Season> {
    const row = await this.prisma.racingSeason.create({
      data: { name: data.name, startsAt: data.startsAt },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Season | null> {
    const row = await this.prisma.racingSeason.findUnique({ where: { id } });
    return row === null ? null : toDomain(row);
  }

  async findCurrent(): Promise<Season | null> {
    const row = await this.prisma.racingSeason.findFirst({
      where: { endsAt: null },
    });
    return row === null ? null : toDomain(row);
  }

  async list(): Promise<Season[]> {
    const rows = await this.prisma.racingSeason.findMany({
      orderBy: { startsAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async close(id: string, endsAt: Date): Promise<void> {
    await this.prisma.racingSeason.update({ where: { id }, data: { endsAt } });
  }
}
