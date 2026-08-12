import { DomainError } from '../../../../shared/errors/domain-error';

// La vuelta no puede ser real. El motivo va en el detalle para poder revisarlo
// después: si empieza a saltar mucho con un motivo concreto, o hay un agujero
// en el juego o la regla está mal calibrada.
export class ImplausibleLapTimeError extends DomainError {
  constructor(reason: string, details: Record<string, unknown> = {}) {
    super('RACING_IMPLAUSIBLE_LAP_TIME', `Vuelta rechazada: ${reason}`, {
      reason,
      ...details,
    });
  }
}
