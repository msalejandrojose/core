import type { ParkingStatus } from '@core/shared-types';

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
}
