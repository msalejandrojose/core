export const BRIO_CONNECTION_PREFS = Symbol('BRIO_CONNECTION_PREFS');

export interface ConnectionPrefs {
  /** Traer entrenos del reloj. */
  importActivities: boolean;
  /** Traer sueño, pulso en reposo, variabilidad y pasos. */
  importHealth: boolean;
  /** Porcentaje (0–100) del gasto de los entrenos que se suma a las kcal del día. */
  exerciseKcalSharePct: number;
}

export const DEFAULT_CONNECTION_PREFS: ConnectionPrefs = {
  importActivities: true,
  importHealth: true,
  exerciseKcalSharePct: 100,
};

export interface ConnectionPrefsPort {
  /** Las preferencias del usuario, o las de fábrica si nunca las ha tocado. */
  get(userId: string): Promise<ConnectionPrefs>;
  save(
    userId: string,
    prefs: Partial<ConnectionPrefs>,
  ): Promise<ConnectionPrefs>;
}

/** Kcal de ejercicio que cuentan para el día, según el porcentaje elegido. */
export function countedExerciseKcal(burned: number, sharePct: number): number {
  return Math.round((burned * Math.min(100, Math.max(0, sharePct))) / 100);
}
