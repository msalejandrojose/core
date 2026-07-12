import type { ParkingStatus } from '@core/shared-types';
import type { ParkingPhoto } from './parking-photo.entity';

export type { ParkingStatus };

export interface Parking {
  id: string;
  hostUserId: string;

  title: string;
  description: string | null;

  // Ubicación
  address: string;
  latitude: number;
  longitude: number;
  postalCodeId: string | null;

  accessInstructions: string | null;
  pricePerDay: number;
  status: ParkingStatus;

  createdAt: Date;
  updatedAt: Date;

  // Galería, ordenada por `position`.
  photos: ParkingPhoto[];
}
