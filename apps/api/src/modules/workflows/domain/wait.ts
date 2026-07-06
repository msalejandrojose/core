import { parseDurationSeconds } from './value-objects/duration.vo';

// Intervalo de reevaluación por defecto de un wait_for_condition sin pollInterval.
export const DEFAULT_POLL_SECONDS = 60;

// Próximo instante en que reevaluar una condición. Se acota al deadline: la
// última reevaluación ocurre justo al vencer el timeout (donde se toma onTimeout).
export function nextPollAt(
  pollInterval: string | number | undefined,
  deadlineAt: Date | null,
  now: Date = new Date(),
): Date {
  const poll =
    pollInterval != null
      ? parseDurationSeconds(pollInterval)
      : DEFAULT_POLL_SECONDS;
  const next = new Date(now.getTime() + Math.max(1, poll) * 1000);
  if (deadlineAt && next.getTime() > deadlineAt.getTime()) return deadlineAt;
  return next;
}
