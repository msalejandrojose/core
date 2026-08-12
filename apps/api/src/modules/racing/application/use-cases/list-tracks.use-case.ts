import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Track } from '../../domain/entities/track.entity';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

@Injectable()
export class ListTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  execute(opts: { limit: number; cursor?: string }): Promise<CursorPage<Track>> {
    return this.tracks.listActive(opts);
  }
}
