export const RITMO_ACCOUNT_REPOSITORY = Symbol('RITMO_ACCOUNT_REPOSITORY');

/**
 * Copia de todo lo que el usuario ha guardado en Ritmo. Es un volcado tal cual
 * (filas de cada tabla), pensado para que la persona se lo lleve, no para que
 * otra app lo importe.
 */
export interface RitmoAccountExport {
  exportedAt: string;
  account: { email: string; firstName: string | null; lastName: string | null };
  profile: unknown;
  measurements: unknown[];
  activityTypes: unknown[];
  sessions: unknown[];
  foods: unknown[];
  meals: unknown[];
  dailyLogs: unknown[];
  exercises: unknown[];
  heartConfig: unknown;
  performanceMeasurements: unknown[];
  plans: unknown[];
  plannedSessions: unknown[];
}

export interface RitmoAccountRepositoryPort {
  exportAll(userId: string): Promise<RitmoAccountExport | null>;
  /** Borra la cuenta; las tablas de Ritmo caen en cascada. */
  deleteAccount(userId: string): Promise<void>;
}
