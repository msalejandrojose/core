import { CarArchetype as PrismaCarArchetype } from '../../../../generated/prisma/client';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';

export function toCarArchetypeDomain(row: PrismaCarArchetype): CarArchetype {
  return new CarArchetype(
    row.id,
    row.code,
    row.name,
    row.speedScale,
    row.grip,
    row.offroadGripModifier,
    row.isActive,
  );
}
