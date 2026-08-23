import { DomainError } from '../../../../shared/errors/domain-error';

export class RacingCircuitRotationConfigNotFoundError extends DomainError {
  constructor(key: string) {
    super(
      'RACING_CIRCUIT_ROTATION_CONFIG_NOT_FOUND',
      `Parámetro de rotación de circuitos ${key} no encontrado.`,
      { key },
    );
  }
}
