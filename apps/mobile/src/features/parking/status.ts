import type { ReservationStatus, ParkingStatus } from './parking.api';

const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

const RESERVATION_STATUS_COLOR: Record<ReservationStatus, string> = {
  PENDING: 'primary',
  CONFIRMED: 'secondary',
  CANCELLED: 'danger',
};

const PARKING_STATUS_LABEL: Record<ParkingStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  UNPUBLISHED: 'Despublicada',
};

// Los DTOs llegan tipados vía `@core/api-client` (`components['schemas']`),
// que resuelve a `any` hasta que se regenera el schema OpenAPI localmente
// (`pnpm --filter @core/api-client generate` contra la API en marcha). Estas
// funciones centralizan el cast a los enums locales en vez de repetirlo en
// cada pantalla, y no rompen si llega un valor inesperado.
export function reservationStatusLabel(status: ReservationStatus): string {
  return RESERVATION_STATUS_LABEL[status] ?? status;
}

export function reservationStatusColor(status: ReservationStatus): string {
  return RESERVATION_STATUS_COLOR[status] ?? 'medium';
}

export function parkingStatusLabel(status: ParkingStatus): string {
  return PARKING_STATUS_LABEL[status] ?? status;
}
