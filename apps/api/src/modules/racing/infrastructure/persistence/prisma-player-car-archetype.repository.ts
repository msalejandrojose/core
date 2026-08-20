import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlayerCarArchetypeRepositoryPort } from '../../application/ports/player-car-archetype-repository.port';

@Injectable()
export class PrismaPlayerCarArchetypeRepository
  implements PlayerCarArchetypeRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async listOwnedArchetypeIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.playerCarArchetype.findMany({
      where: { userId },
      select: { archetypeId: true },
    });
    return rows.map((row) => row.archetypeId);
  }

  async ownsArchetype(userId: string, archetypeId: string): Promise<boolean> {
    const count = await this.prisma.playerCarArchetype.count({
      where: { userId, archetypeId },
    });
    return count > 0;
  }

  async grant(userId: string, archetypeId: string): Promise<void> {
    await this.prisma.playerCarArchetype.upsert({
      where: { userId_archetypeId: { userId, archetypeId } },
      create: { userId, archetypeId },
      update: {},
    });
  }
}
