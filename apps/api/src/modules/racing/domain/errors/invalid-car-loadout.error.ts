import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidCarLoadoutError extends DomainError {
  constructor(reason: string, details: Record<string, unknown> = {}) {
    super(
      'RACING_INVALID_CAR_LOADOUT',
      `Configuración de coche inválida: ${reason}.`,
      details,
    );
  }
}
