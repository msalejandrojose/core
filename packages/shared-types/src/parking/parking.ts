import { z } from 'zod';

export const ParkingStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED']);
export type ParkingStatus = z.infer<typeof ParkingStatusSchema>;
export const PARKING_STATUSES = ParkingStatusSchema.options;

/**
 * Máquina de estados de publicación de una plaza. `DRAFT` es solo el punto de
 * partida (no se vuelve a él); `PUBLISHED`/`UNPUBLISHED` es un toggle
 * reversible una vez la plaza está completa.
 */
export const PARKING_STATUS_TRANSITIONS: Record<ParkingStatus, readonly ParkingStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['UNPUBLISHED'],
  UNPUBLISHED: ['PUBLISHED'],
};

export function canTransitionParkingStatus(from: ParkingStatus, to: ParkingStatus): boolean {
  return PARKING_STATUS_TRANSITIONS[from].includes(to);
}

// Visible y reservable en el buscador público.
export function isBookableParkingStatus(status: ParkingStatus): boolean {
  return status === 'PUBLISHED';
}

export const ReservationStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
export const RESERVATION_STATUSES = ReservationStatusSchema.options;

/**
 * Máquina de estados de una reserva. `CANCELLED` es terminal. No hay
 * `COMPLETED`: una reserva `CONFIRMED` cuyo rango de fechas ya pasó se
 * considera completada por cálculo, no por estado propio.
 */
export const RESERVATION_STATUS_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [],
};

export function canTransitionReservationStatus(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  return RESERVATION_STATUS_TRANSITIONS[from].includes(to);
}

// Reservas que bloquean su rango de fechas para el cálculo de anti-solape.
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = ['PENDING', 'CONFIRMED'];

export function blocksAvailability(status: ReservationStatus): boolean {
  return ACTIVE_RESERVATION_STATUSES.includes(status);
}
