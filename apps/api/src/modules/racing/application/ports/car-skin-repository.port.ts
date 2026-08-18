import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CarSkin } from '../../domain/entities/car-skin.entity';

export const CAR_SKIN_REPOSITORY = Symbol('RACING_CAR_SKIN_REPOSITORY');

export interface AdminListCarSkinsOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface CreateCarSkinData {
  code: string;
  name: string;
  modelPath: string;
  isUnlockedByDefault: boolean;
  isActive: boolean;
}

export interface UpdateCarSkinPatch {
  name?: string;
  modelPath?: string;
  isUnlockedByDefault?: boolean;
  isActive?: boolean;
}

export interface CarSkinRepositoryPort {
  findById(id: string): Promise<CarSkin | null>;
  existsCode(code: string, excludeId?: string): Promise<boolean>;
  /** Catálogo de cara al jugador: solo skins activos. */
  listActive(): Promise<CarSkin[]>;
  /** Listado de administración: incluye inactivos. */
  listAll(opts: AdminListCarSkinsOptions): Promise<PaginatedResult<CarSkin>>;
  create(data: CreateCarSkinData): Promise<CarSkin>;
  update(id: string, patch: UpdateCarSkinPatch): Promise<CarSkin>;
}
