import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RacingCircuitRotationConfigRepositoryPort } from '../../application/ports/racing-circuit-rotation-config-repository.port';
import {
  RacingCircuitRotationConfig,
  RacingCircuitRotationConfigKey,
} from '../../domain/entities/racing-circuit-rotation-config.entity';
import { toRacingCircuitRotationConfigDomain } from '../mappers/racing-circuit-rotation-config.mapper';

@Injectable()
export class PrismaRacingCircuitRotationConfigRepository
  implements RacingCircuitRotationConfigRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RacingCircuitRotationConfig[]> {
    const rows = await this.prisma.racingCircuitRotationConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map(toRacingCircuitRotationConfigDomain);
  }

  async findByKey(
    key: RacingCircuitRotationConfigKey,
  ): Promise<RacingCircuitRotationConfig | null> {
    const row = await this.prisma.racingCircuitRotationConfig.findUnique({
      where: { key },
    });
    return row === null ? null : toRacingCircuitRotationConfigDomain(row);
  }

  async update(
    key: RacingCircuitRotationConfigKey,
    value: number,
  ): Promise<RacingCircuitRotationConfig> {
    const row = await this.prisma.racingCircuitRotationConfig.update({
      where: { key },
      data: { value },
    });
    return toRacingCircuitRotationConfigDomain(row);
  }

  async getValues(): Promise<ReadonlyMap<RacingCircuitRotationConfigKey, number>> {
    const rows = await this.findAll();
    return new Map(rows.map((row) => [row.key, row.value]));
  }
}
