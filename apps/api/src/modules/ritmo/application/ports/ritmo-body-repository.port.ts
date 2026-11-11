import type { BodyMeasurement } from '../../domain/entities/body-measurement.entity';

export const RITMO_BODY_REPOSITORY = Symbol('RITMO_BODY_REPOSITORY');

export interface SaveMeasurementData {
  userId: string;
  measuredOn: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  notes: string | null;
}

export interface RitmoBodyRepositoryPort {
  /** Idempotente por (usuario, día): pesarse dos veces el mismo día no duplica. */
  save(data: SaveMeasurementData): Promise<BodyMeasurement>;
  /**
   * Peso más reciente del usuario, para las fórmulas de energía. `null` si
   * nunca se ha pesado — en ese caso no se estima nada.
   */
  latestWeightKg(userId: string): Promise<number | null>;
  /** Serie de mediciones en un rango de días, ascendente. */
  listBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<BodyMeasurement[]>;
}
