import { DomainError } from '../../../../shared/errors/domain-error';

/** Anti-solape: el rango pedido se cruza con un bloqueo del host o con otra reserva activa. */
export class ParkingNotAvailableError extends DomainError {
  constructor(parkingId: string, startDate: Date, endDate: Date) {
    super(
      'PARKING_NOT_AVAILABLE',
      'La plaza no está disponible en el rango de fechas solicitado.',
      {
        parkingId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );
  }
}
