import { DomainError } from '../../../../shared/errors/domain-error';

// Envuelve el rechazo de `validateGrandPrixStages`, mismo patrón que
// `InvalidTrackPathError` con `validateTrackPath`.
export class InvalidGrandPrixStagesError extends DomainError {
  constructor(reason: string, details: Record<string, unknown> = {}) {
    super(
      'RACING_INVALID_GRAND_PRIX_STAGES',
      `Circuitos del Grand Prix inválidos: ${reason}.`,
      details,
    );
  }
}
