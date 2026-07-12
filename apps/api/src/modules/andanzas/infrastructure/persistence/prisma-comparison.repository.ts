import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  ComparisonRepositoryPort,
  CreateComparisonData,
} from '../../application/ports/comparison-repository.port';

@Injectable()
export class PrismaComparisonRepository implements ComparisonRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateComparisonData): Promise<void> {
    await this.prisma.comparison.create({
      data: {
        id: randomUUID(),
        userId: data.userId,
        winnerEntryId: data.winnerEntryId,
        loserEntryId: data.loserEntryId,
      },
    });
  }
}
