import { PlayerCarLoadout as PrismaPlayerCarLoadout } from '../../../../generated/prisma/client';
import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';

export function toPlayerCarLoadoutDomain(
  row: PrismaPlayerCarLoadout,
): PlayerCarLoadout {
  return new PlayerCarLoadout(
    row.userId,
    row.archetypeId,
    row.tiresPartId,
    row.wingPartId,
    row.chassisPartId,
    row.skinId,
  );
}
