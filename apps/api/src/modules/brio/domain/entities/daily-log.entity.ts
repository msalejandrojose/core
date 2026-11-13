// Agregado de un día natural. Materializado porque es la pantalla principal de
// la app: derivarlo en cada apertura obligaría a sumar todas las comidas y
// sesiones del día.
export interface DailyLog {
  userId: string;
  /** Día (`YYYY-MM-DD`). */
  logDate: string;
  kcalIn: number;
  kcalBurned: number;
  /** Snapshot del objetivo vigente ese día. */
  kcalTarget: number | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
  steps: number | null;
  waterMl: number | null;
  weightKg: number | null;
}
