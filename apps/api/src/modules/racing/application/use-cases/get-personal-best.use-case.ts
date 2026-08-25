import { Inject, Injectable } from '@nestjs/common';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

@Injectable()
export class GetPersonalBestUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
  ) {}

  async execute(userId: string, slug: string): Promise<LapTime | null> {
    const track = await this.tracks.findBySlug(slug);
    if (track === null) throw new TrackNotFoundError(slug);

    return this.laps.findPersonalBest(userId, track.id);
  }
}
