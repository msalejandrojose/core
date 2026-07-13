import type { Reservation } from './entities/reservation.entity';

/**
 * Solo se puede reseñar una estancia ya completada: reserva `CONFIRMED` cuyo
 * `endDate` ya pasó. Mismo criterio de "completada por cálculo" que usa
 * `DOMAIN.md` para no mantener un estado `COMPLETED` propio.
 */
export function isReservationReviewable(
  reservation: Pick<Reservation, 'status' | 'endDate'>,
  now: Date = new Date(),
): boolean {
  return (
    reservation.status === 'CONFIRMED' &&
    reservation.endDate.getTime() < now.getTime()
  );
}
