import { Inject, Injectable } from '@nestjs/common';
import { Track } from '../../domain/entities/track.entity';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

// De cara al jugador: circuito completo (con geometría) por slug. Lo usa el
// cliente para construir un circuito que no tenga en su catálogo local —
// típicamente uno nacido en el backoffice, o una manga de Grand Prix — sin
// tener que paginar el listado entero buscándolo (TASK-245).
@Injectable()
export class GetTrackUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  async execute(slug: string): Promise<Track> {
    const track = await this.tracks.findBySlug(slug);
    if (!track || !track.isActive) {
      throw new TrackNotFoundError(slug);
    }
    return track;
  }
}
