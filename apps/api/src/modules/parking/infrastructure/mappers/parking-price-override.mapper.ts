import { ParkingPriceOverride } from '../../domain/entities/parking-price-override.entity';

interface DecimalLike {
  toNumber(): number;
}

export interface ParkingPriceOverrideRow {
  id: string;
  parkingId: string;
  startDate: Date;
  endDate: Date;
  pricePerDay: DecimalLike;
  label: string | null;
  createdAt: Date;
}

export function toParkingPriceOverrideDomain(
  row: ParkingPriceOverrideRow,
): ParkingPriceOverride {
  return {
    id: row.id,
    parkingId: row.parkingId,
    startDate: row.startDate,
    endDate: row.endDate,
    pricePerDay: row.pricePerDay.toNumber(),
    label: row.label,
    createdAt: row.createdAt,
  };
}
