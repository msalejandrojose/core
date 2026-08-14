import { DomainError } from '../../../../shared/errors/domain-error';

// Se sube el resultado de un circuito que no es la siguiente manga pendiente
// del intento en curso (o el intento ya está COMPLETED). Las mangas se
// disputan en el orden fijado por el Grand Prix, sin saltos.
export class GrandPrixAttemptStageMismatchError extends DomainError {
  constructor(attemptId: string, expectedTrackId: string | null) {
    super(
      'RACING_GRAND_PRIX_ATTEMPT_STAGE_MISMATCH',
      expectedTrackId === null
        ? `El intento ${attemptId} ya está completado.`
        : `El intento ${attemptId} espera el resultado del circuito ${expectedTrackId}.`,
      { attemptId, expectedTrackId },
    );
  }
}
