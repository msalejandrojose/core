import { Track as PrismaTrack } from '../../../../generated/prisma/client';
import { Track } from '../../domain/entities/track.entity';

export function toTrackDomain(row: PrismaTrack): Track {
  return new Track(
    row.id,
    row.slug,
    row.name,
    row.sectorCount,
    row.minPlausibleMs,
    row.isActive,
  );
}
