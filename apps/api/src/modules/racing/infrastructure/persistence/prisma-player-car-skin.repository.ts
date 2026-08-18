import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlayerCarSkinRepositoryPort } from '../../application/ports/player-car-skin-repository.port';

@Injectable()
export class PrismaPlayerCarSkinRepository implements PlayerCarSkinRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listOwnedSkinIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.playerCarSkin.findMany({
      where: { userId },
      select: { skinId: true },
    });
    return rows.map((row) => row.skinId);
  }

  async ownsSkin(userId: string, skinId: string): Promise<boolean> {
    const count = await this.prisma.playerCarSkin.count({
      where: { userId, skinId },
    });
    return count > 0;
  }

  async grant(userId: string, skinId: string): Promise<void> {
    await this.prisma.playerCarSkin.upsert({
      where: { userId_skinId: { userId, skinId } },
      create: { userId, skinId },
      update: {},
    });
  }
}
