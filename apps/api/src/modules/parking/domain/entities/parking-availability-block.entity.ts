// Bloqueo de disponibilidad definido por el host (mantenimiento, uso
// personal…), independiente de las reservas. Ver DOMAIN.md — el cálculo de
// disponibilidad combina estos bloqueos con las reservas activas.
export interface ParkingAvailabilityBlock {
  id: string;
  parkingId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  createdAt: Date;
}
