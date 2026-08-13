import { Inject, Injectable } from '@nestjs/common';
import { Track } from '../../domain/entities/track.entity';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

@Injectable()
export class AdminGetTrackUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  async execute(id: string): Promise<Track> {
    const track = await this.tracks.findById(id);
    if (!track) throw new TrackNotFoundError(id);
    return track;
  }
}
