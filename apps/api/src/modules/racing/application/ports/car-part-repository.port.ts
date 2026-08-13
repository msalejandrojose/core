import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  CarPart,
  CarPartCategory,
} from '../../domain/entities/car-part.entity';

export const CAR_PART_REPOSITORY = Symbol('RACING_CAR_PART_REPOSITORY');

export interface AdminListCarPartsOptions {
  page: number;
  limit: number;
  search?: string;
  category?: CarPartCategory;
}

export interface CreateCarPartData {
  code: string;
  category: CarPartCategory;
  name: string;
  speedScale: number;
  grip: number;
  isActive: boolean;
}

export interface UpdateCarPartPatch {
  category?: CarPartCategory;
  name?: string;
  speedScale?: number;
  grip?: number;
  isActive?: boolean;
}

export interface CarPartRepositoryPort {
  findById(id: string): Promise<CarPart | null>;
  existsCode(code: string, excludeId?: string): Promise<boolean>;
  /** Catálogo de cara al jugador: solo piezas activas. */
  listActive(): Promise<CarPart[]>;
  /** Listado de administración: incluye inactivas. */
  listAll(opts: AdminListCarPartsOptions): Promise<PaginatedResult<CarPart>>;
  create(data: CreateCarPartData): Promise<CarPart>;
  update(id: string, patch: UpdateCarPartPatch): Promise<CarPart>;
}
