import type { ParkingStatus } from '@core/shared-types';
import { CursorPage } from '../../../../shared/pagination';
import { Parking } from '../../domain/entities/parking.entity';

export const PARKING_REPOSITORY = Symbol('PARKING_PARKING_REPOSITORY');

export interface CreateParkingData {
  hostUserId: string;
  title: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  postalCodeId: string | null;
  accessInstructions: string | null;
  pricePerDay: number;
}

export interface UpdateParkingPatch {
  title?: string;
  description?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  postalCodeId?: string | null;
  accessInstructions?: string | null;
  pricePerDay?: number;
  status?: ParkingStatus;
}

export interface ListMyParkingsOptions {
  hostUserId: string;
  limit: number;
  cursor?: string;
  status?: ParkingStatus;
}

export interface SearchPublicParkingsOptions {
  limit: number;
  cursor?: string;
  /** Búsqueda libre por título o dirección (buscador público). */
  q?: string;
}

export interface ListAllParkingsOptions {
  limit: number;
  cursor?: string;
  status?: ParkingStatus;
  hostUserId?: string;
}

export interface ParkingRepositoryPort {
  create(data: CreateParkingData): Promise<Parking>;
  update(id: string, patch: UpdateParkingPatch): Promise<Parking>;
  /** Sin scope de host — para que otros módulos (p.ej. `parking` reservas) consulten cualquier plaza. */
  findById(id: string): Promise<Parking | null>;
  /** Scoped al host: `null` tanto si no existe como si pertenece a otro host. */
  findByIdForHost(id: string, hostUserId: string): Promise<Parking | null>;
  /** `null` si no existe o no está `PUBLISHED` (ficha pública). */
  findPublishedById(id: string): Promise<Parking | null>;
  list(opts: ListMyParkingsOptions): Promise<CursorPage<Parking>>;
  /** Buscador público: solo plazas `PUBLISHED`. */
  searchPublished(
    opts: SearchPublicParkingsOptions,
  ): Promise<CursorPage<Parking>>;
  /** Backoffice: todas las plazas, de cualquier host, para moderación. */
  listAll(opts: ListAllParkingsOptions): Promise<CursorPage<Parking>>;
  addPhoto(parkingId: string, storedFileId: string): Promise<Parking>;
  removePhoto(parkingId: string, photoId: string): Promise<Parking>;
}
