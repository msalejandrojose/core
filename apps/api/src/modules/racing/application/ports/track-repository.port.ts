import { CursorPage } from '../../../../shared/pagination';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';

export const TRACK_REPOSITORY = Symbol('RACING_TRACK_REPOSITORY');

export interface ListTracksOptions {
  limit: number;
  cursor?: string;
}

export interface AdminListTracksOptions {
  page: number;
  limit: number;
  /** Filtra por slug o nombre (substring). */
  search?: string;
}

export interface CreateTrackData {
  slug: string;
  name: string;
  sectorCount: number;
  minPlausibleMs: number;
  path: TrackCell[];
  theme: TrackTheme;
  grip: number;
  isActive: boolean;
}

export interface UpdateTrackPatch {
  name?: string;
  sectorCount?: number;
  minPlausibleMs?: number;
  path?: TrackCell[];
  theme?: TrackTheme;
  grip?: number;
  isActive?: boolean;
}

export interface TrackRepositoryPort {
  findBySlug(slug: string): Promise<Track | null>;
  findById(id: string): Promise<Track | null>;
  /** Excluye `excludeId` de la comprobación — hace falta al editar sin
   *  tropezar con el propio slug del circuito que se está guardando. */
  existsSlug(slug: string, excludeId?: string): Promise<boolean>;
  listActive(opts: ListTracksOptions): Promise<CursorPage<Track>>;
  /** Listado de administración: TODOS los circuitos, activos o no. */
  listAll(opts: AdminListTracksOptions): Promise<PaginatedResult<Track>>;
  create(data: CreateTrackData): Promise<Track>;
  update(id: string, patch: UpdateTrackPatch): Promise<Track>;
}
