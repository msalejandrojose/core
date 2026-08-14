import { DomainError } from '../../../../shared/errors/domain-error';

// Se manda el resultado de una manga sin haber arrancado (o reanudado) el
// Grand Prix antes — el cliente tiene que llamar a start-or-resume primero.
export class GrandPrixAttemptNotInProgressError extends DomainError {
  constructor(userId: string, grandPrixId: string) {
    super(
      'RACING_GRAND_PRIX_ATTEMPT_NOT_IN_PROGRESS',
      `El jugador ${userId} no tiene un intento en curso del Grand Prix ${grandPrixId}.`,
      { userId, grandPrixId },
    );
  }
}
