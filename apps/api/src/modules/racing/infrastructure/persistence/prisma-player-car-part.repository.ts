import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlayerCarPartRepositoryPort } from '../../application/ports/player-car-part-repository.port';

@Injectable()
export class PrismaPlayerCarPartRepository
  implements PlayerCarPartRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async listOwnedPartIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.playerCarPart.findMany({
      where: { userId },
      select: { partId: true },
    });
    return rows.map((row) => row.partId);
  }

  async ownsPart(userId: string, partId: string): Promise<boolean> {
    const count = await this.prisma.playerCarPart.count({
      where: { userId, partId },
    });
    return count > 0;
  }

  async grant(userId: string, partId: string): Promise<void> {
    await this.prisma.playerCarPart.upsert({
      where: { userId_partId: { userId, partId } },
      create: { userId, partId },
      update: {},
    });
  }
}
