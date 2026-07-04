export const CRON_CLOCK = Symbol('workflows.CronClock');

// Puerto sobre la librería de cron: calcula el próximo disparo de una expresión
// (5 campos, UTC) y valida su sintaxis. Aísla application/scheduler de la
// implementación concreta (cron-parser).
export interface CronClockPort {
  // Próximo instante en que dispara `expression` estrictamente después de
  // `from`. Lanza si la expresión es inválida.
  next(expression: string, from: Date): Date;
  isValid(expression: string): boolean;
}
