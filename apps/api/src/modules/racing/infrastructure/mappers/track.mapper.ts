import {
  RacingCircuit as PrismaRacingCircuit,
  Track as PrismaTrack,
} from '../../../../generated/prisma/client';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';

export type PrismaTrackWithCircuit = PrismaTrack & { circuit: PrismaRacingCircuit };

// El circuito padre viaja SIEMPRE incluido (`include: { circuit: true }` en
// cada query del repositorio) para poder denormalizar aquí su geometría —
// mismo patrón que `GrandPrixStage` denormaliza `trackSlug`/`trackName`.
export function toTrackDomain(row: PrismaTrackWithCircuit): Track {
  return new Track(
    row.id,
    row.slug,
    row.name,
    row.circuitId,
    row.sectorCount,
    row.minPlausibleMs,
    row.isActive,
    row.circuit.path as unknown as TrackCell[],
    TrackTheme[row.circuit.theme],
    row.circuit.grip,
    row.circuit.imageId,
    row.circuit.slug,
    row.circuit.name,
  );
}
