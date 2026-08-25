import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';

export const CAR_ARCHETYPE_REPOSITORY = Symbol(
  'RACING_CAR_ARCHETYPE_REPOSITORY',
);

export interface AdminListCarArchetypesOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface CreateCarArchetypeData {
  code: string;
  name: string;
  speedScale: number;
  grip: number;
  offroadGripModifier: number;
  /** Default true: hasta que se ponga a false explícitamente (TASK-320,
   *  tienda) no bloquea nada. */
  isUnlockedByDefault?: boolean;
  /** null = no está a la venta. */
  priceCoins?: number | null;
  isActive: boolean;
}

export interface UpdateCarArchetypePatch {
  name?: string;
  speedScale?: number;
  grip?: number;
  offroadGripModifier?: number;
  isUnlockedByDefault?: boolean;
  priceCoins?: number | null;
  isActive?: boolean;
}

export interface CarArchetypeRepositoryPort {
  findById(id: string): Promise<CarArchetype | null>;
  existsCode(code: string, excludeId?: string): Promise<boolean>;
  /** Catálogo de cara al jugador: solo arquetipos activos. */
  listActive(): Promise<CarArchetype[]>;
  /** Listado de administración: incluye inactivos. */
  listAll(
    opts: AdminListCarArchetypesOptions,
  ): Promise<PaginatedResult<CarArchetype>>;
  create(data: CreateCarArchetypeData): Promise<CarArchetype>;
  update(id: string, patch: UpdateCarArchetypePatch): Promise<CarArchetype>;
}
