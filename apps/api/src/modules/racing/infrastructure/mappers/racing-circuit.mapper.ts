import { RacingCircuit as PrismaRacingCircuit } from '../../../../generated/prisma/client';
import { GrandPrixCircuitWeather } from '../../domain/entities/grand-prix.entity';
import { RacingCircuit } from '../../domain/entities/racing-circuit.entity';
import { TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';

export function toRacingCircuitDomain(row: PrismaRacingCircuit): RacingCircuit {
  return new RacingCircuit(
    row.id,
    row.slug,
    row.name,
    row.checkpoints,
    row.path as unknown as TrackCell[],
    TrackTheme[row.theme],
    row.weather as GrandPrixCircuitWeather,
    row.grip,
    row.imageId,
    row.isActive,
    row.isInRotation,
    row.rotatedAt,
  );
}
