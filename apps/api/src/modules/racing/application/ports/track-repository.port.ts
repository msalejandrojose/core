import { CursorPage } from '../../../../shared/pagination';
import { Track } from '../../domain/entities/track.entity';

export const TRACK_REPOSITORY = Symbol('RACING_TRACK_REPOSITORY');

export interface ListTracksOptions {
  limit: number;
  cursor?: string;
}

export interface TrackRepositoryPort {
  findBySlug(slug: string): Promise<Track | null>;
  listActive(opts: ListTracksOptions): Promise<CursorPage<Track>>;
}
