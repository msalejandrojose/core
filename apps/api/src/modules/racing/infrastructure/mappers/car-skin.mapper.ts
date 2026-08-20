import { CarSkin as PrismaCarSkin } from '../../../../generated/prisma/client';
import { CarSkin } from '../../domain/entities/car-skin.entity';

export function toCarSkinDomain(row: PrismaCarSkin): CarSkin {
  return new CarSkin(
    row.id,
    row.code,
    row.name,
    row.modelPath,
    row.isUnlockedByDefault,
    row.priceCoins,
    row.isActive,
  );
}
