import { CarPart as PrismaCarPart } from '../../../../generated/prisma/client';
import {
  CarPart,
  CarPartCategory,
} from '../../domain/entities/car-part.entity';

export function toCarPartDomain(row: PrismaCarPart): CarPart {
  return new CarPart(
    row.id,
    row.code,
    CarPartCategory[row.category],
    row.name,
    row.speedScale,
    row.grip,
    row.isUnlockedByDefault,
    row.priceCoins,
    row.isActive,
  );
}
