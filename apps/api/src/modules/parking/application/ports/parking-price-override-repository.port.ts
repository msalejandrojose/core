import { ParkingPriceOverride } from '../../domain/entities/parking-price-override.entity';

export const PARKING_PRICE_OVERRIDE_REPOSITORY = Symbol(
  'PARKING_PRICE_OVERRIDE_REPOSITORY',
);

export interface CreateParkingPriceOverrideData {
  parkingId: string;
  startDate: Date;
  endDate: Date;
  pricePerDay: number;
  label: string | null;
}

export interface ParkingPriceOverrideRepositoryPort {
  create(data: CreateParkingPriceOverrideData): Promise<ParkingPriceOverride>;
  /** Scoped a la plaza: `null` tanto si no existe como si es de otra plaza. */
  findByIdForParking(
    id: string,
    parkingId: string,
  ): Promise<ParkingPriceOverride | null>;
  delete(id: string): Promise<void>;
  listForParking(parkingId: string): Promise<ParkingPriceOverride[]>;
  /** Overrides de una plaza que se cruzan con `[startDate, endDate)` — para calcular el precio de una reserva/quote. */
  listOverlapping(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ParkingPriceOverride[]>;
}
