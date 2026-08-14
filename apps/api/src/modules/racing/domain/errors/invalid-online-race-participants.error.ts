import { DomainError } from '../../../../shared/errors/domain-error';

// Envuelve el rechazo de `validateOnlineRaceParticipants`, mismo patrón que
// `InvalidGrandPrixStagesError` con `validateGrandPrixStages`.
export class InvalidOnlineRaceParticipantsError extends DomainError {
  constructor(reason: string, details: Record<string, unknown> = {}) {
    super(
      'RACING_INVALID_ONLINE_RACE_PARTICIPANTS',
      `Carrera online inválida: ${reason}.`,
      details,
    );
  }
}
