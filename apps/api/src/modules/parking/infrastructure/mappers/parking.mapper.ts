import type { ParkingStatus } from '@core/shared-types';
import { Parking } from '../../domain/entities/parking.entity';

interface DecimalLike {
  toNumber(): number;
}

interface ParkingPhotoRow {
  id: string;
  parkingId: string;
  storedFileId: string;
  position: number;
  createdAt: Date;
}

export interface ParkingRow {
  id: string;
  hostUserId: string;
  title: string;
  description: string | null;
  address: string;
  latitude: DecimalLike;
  longitude: DecimalLike;
  postalCodeId: string | null;
  accessInstructions: string | null;
  pricePerDay: DecimalLike;
  status: string;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  photos?: ParkingPhotoRow[];
}

export function toParkingDomain(row: ParkingRow): Parking {
  return {
    id: row.id,
    hostUserId: row.hostUserId,
    title: row.title,
    description: row.description,
    address: row.address,
    latitude: row.latitude.toNumber(),
    longitude: row.longitude.toNumber(),
    postalCodeId: row.postalCodeId,
    accessInstructions: row.accessInstructions,
    pricePerDay: row.pricePerDay.toNumber(),
    status: row.status as ParkingStatus,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    photos: (row.photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        id: p.id,
        parkingId: p.parkingId,
        storedFileId: p.storedFileId,
        position: p.position,
        createdAt: p.createdAt,
      })),
  };
}
