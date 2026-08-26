import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { GrandPrixCircuitWeather } from '../../domain/entities/grand-prix.entity';
import { RacingCircuit } from '../../domain/entities/racing-circuit.entity';
import { TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';

export const RACING_CIRCUIT_REPOSITORY = Symbol('RACING_CIRCUIT_REPOSITORY');

export interface AdminListCircuitsOptions {
  page: number;
  limit: number;
  /** Filtra por slug o nombre (substring). */
  search?: string;
}

// Sin `slug` (inmutable) ni `isInRotation`/`rotatedAt` (los escribe solo el
// rotador diario, no un PATCH de admin).
export interface UpdateCircuitPatch {
  name?: string;
  checkpoints?: number;
  path?: TrackCell[];
  theme?: TrackTheme;
  weather?: GrandPrixCircuitWeather;
  grip?: number;
  isActive?: boolean;
  /** `null` limpia la imagen; `undefined` la deja tal cual. */
  imageId?: string | null;
}

export interface RacingCircuitRepositoryPort {
  findById(id: string): Promise<RacingCircuit | null>;
  findBySlug(slug: string): Promise<RacingCircuit | null>;
  listAll(opts: AdminListCircuitsOptions): Promise<PaginatedResult<RacingCircuit>>;
  update(id: string, patch: UpdateCircuitPatch): Promise<RacingCircuit>;
  /** Ids de circuitos elegibles para la rotación de hoy (`isActive: true`). */
  findActiveCandidateIds(): Promise<string[]>;
  /** La más reciente `rotatedAt` entre todos los circuitos, o null si
   *  ninguno ha rotado todavía. */
  findLastRotatedAt(): Promise<Date | null>;
  /** `isInRotation=true, rotatedAt=rotatedAt` para `selectedIds`,
   *  `isInRotation=false` para el resto — en una sola transacción. */
  applyRotation(selectedIds: readonly string[], rotatedAt: Date): Promise<void>;
}
