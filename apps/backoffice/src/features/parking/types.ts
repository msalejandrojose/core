import type {
  HostVerificationStatus,
  ParkingStatus,
  ReservationStatus,
} from '@core/shared-types';
import {
  HOST_VERIFICATION_STATUSES,
  PARKING_STATUSES,
  RESERVATION_STATUSES,
} from '@core/shared-types';

export type { HostVerificationStatus, ParkingStatus, ReservationStatus };
export { HOST_VERIFICATION_STATUSES, PARKING_STATUSES, RESERVATION_STATUSES };

export interface ParkingPhotoRow {
  id: string;
  storedFileId: string;
  position: number;
  createdAt: string;
  url: string;
}

export interface ParkingRow {
  id: string;
  hostUserId: string;
  title: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  postalCodeId: string | null;
  accessInstructions: string | null;
  pricePerDay: number;
  status: ParkingStatus;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  photos: ParkingPhotoRow[];
}

export interface HostVerificationRow {
  id: string;
  hostUserId: string;
  legalName: string;
  documentFileId: string;
  documentUrl: string;
  status: HostVerificationStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationRow {
  id: string;
  parkingId: string;
  guestUserId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export const PARKING_STATUS_LABELS: Record<ParkingStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  UNPUBLISHED: 'Despublicada',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

export const HOST_VERIFICATION_STATUS_LABELS: Record<HostVerificationStatus, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};
