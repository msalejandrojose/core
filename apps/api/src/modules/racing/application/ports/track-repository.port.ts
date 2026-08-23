import { CursorPage } from '../../../../shared/pagination';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Track } from '../../domain/entities/track.entity';

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

// Sin `path`/`theme`/`grip`/`imageId` (TASK-336): eso ahora vive en
// `RacingCircuit`, se edita vía `RacingCircuitRepositoryPort`. Tampoco hay
// `slug` (inmutable, ver comentario en `AdminUpdateTrackUseCase`) ni
// `circuitId` (una variante no cambia de circuito).
export interface UpdateTrackPatch {
  name?: string;
  sectorCount?: number;
  minPlausibleMs?: number;
  isActive?: boolean;
}

export interface TrackRepositoryPort {
  /** Sin filtrar por estado — la usan flujos que necesitan resolver la
   *  variante exista o no (admin, envío de vueltas/carreras, sala en vivo),
   *  igual que antes de TASK-336. */
  findBySlug(slug: string): Promise<Track | null>;
  findById(id: string): Promise<Track | null>;
  /** De cara al jugador: solo si la variante Y su circuito están
   *  efectivamente activos (interruptor manual + rotación de hoy). Null en
   *  cualquier otro caso, incluida "no existe". */
  findActiveBySlug(slug: string): Promise<Track | null>;
  /** Excluye `excludeId` de la comprobación — hace falta al editar sin
   *  tropezar con el propio slug del circuito que se está guardando. */
  existsSlug(slug: string, excludeId?: string): Promise<boolean>;
  listActive(opts: ListTracksOptions): Promise<CursorPage<Track>>;
  /** Listado de administración: TODAS las variantes, activas o no —
   *  filtrado por su propio `isActive`, no por el del circuito padre. */
  listAll(opts: AdminListTracksOptions): Promise<PaginatedResult<Track>>;
  update(id: string, patch: UpdateTrackPatch): Promise<Track>;
}
