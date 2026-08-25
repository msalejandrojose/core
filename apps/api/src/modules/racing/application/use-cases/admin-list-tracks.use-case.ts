import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Track } from '../../domain/entities/track.entity';
import {
  AdminListTracksOptions,
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

// A diferencia de ListTracksUseCase (jugador, solo circuitos activos, cursor
// paginado), este lista TODOS los circuitos con paginación offset — es el que
// consume el listado de administración.
@Injectable()
export class AdminListTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  execute(opts: AdminListTracksOptions): Promise<PaginatedResult<Track>> {
    return this.tracks.listAll(opts);
  }
}
