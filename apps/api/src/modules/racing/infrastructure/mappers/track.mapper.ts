import { Track as PrismaTrack } from '../../../../generated/prisma/client';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';

export function toTrackDomain(row: PrismaTrack): Track {
  return new Track(
    row.id,
    row.slug,
    row.name,
    row.sectorCount,
    row.minPlausibleMs,
    row.isActive,
    row.path as unknown as TrackCell[],
    TrackTheme[row.theme],
    row.grip,
  );
}
