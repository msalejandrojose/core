import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';

export const GRAND_PRIX_REPOSITORY = Symbol('RACING_GRAND_PRIX_REPOSITORY');

export interface AdminListGrandPrixOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface CreateGrandPrixStageData {
  trackId: string;
  order: number;
}

export interface CreateGrandPrixData {
  slug: string;
  name: string;
  isActive: boolean;
  stages: CreateGrandPrixStageData[];
}

export interface UpdateGrandPrixPatch {
  name?: string;
  isActive?: boolean;
  /** Si viene, sustituye la lista de mangas entera (no hace merge parcial). */
  stages?: CreateGrandPrixStageData[];
}

export interface GrandPrixRepositoryPort {
  findById(id: string): Promise<GrandPrix | null>;
  findBySlug(slug: string): Promise<GrandPrix | null>;
  existsSlug(slug: string, excludeId?: string): Promise<boolean>;
  /** Catálogo de cara al jugador: solo Grand Prix activos. */
  findActive(): Promise<GrandPrix[]>;
  /** Listado de administración: incluye inactivos. */
  listAdmin(
    opts: AdminListGrandPrixOptions,
  ): Promise<PaginatedResult<GrandPrix>>;
  create(data: CreateGrandPrixData): Promise<GrandPrix>;
  update(id: string, patch: UpdateGrandPrixPatch): Promise<GrandPrix>;
}
