// Una medición corporal (una fila de `brio_body_measurement`). Un punto por
// día natural: la gráfica de progreso necesita una serie limpia, no cada vez
// que alguien se sube a la báscula.
export interface BodyMeasurement {
  id: string;
  userId: string;
  /** Día medido (`YYYY-MM-DD`). */
  measuredOn: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  notes: string | null;
}
