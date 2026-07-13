import { ParkingPriceOverride } from './entities/parking-price-override.entity';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Precio total de una reserva noche a noche: para cada noche del rango
 * `[startDate, endDate)` usa el `pricePerDay` del override que la cubra (si
 * hay varios solapados, el más reciente por `createdAt` gana) o el precio
 * base de la plaza si no hay ninguno. Mismos límites semiabiertos que el
 * anti-solape de reservas (`hasOverlap`).
 */
export function calculateReservationTotal(
  basePricePerDay: number,
  overrides: readonly ParkingPriceOverride[],
  startDate: Date,
  endDate: Date,
): number {
  const nights = Math.round(
    (endDate.getTime() - startDate.getTime()) / MS_PER_DAY,
  );
  const sortedOverrides = [...overrides].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let total = 0;
  for (let i = 0; i < nights; i++) {
    const night = new Date(startDate.getTime() + i * MS_PER_DAY);
    const override = sortedOverrides.findLast(
      (o) => night >= o.startDate && night < o.endDate,
    );
    total += override ? override.pricePerDay : basePricePerDay;
  }
  return Math.round(total * 100) / 100;
}
