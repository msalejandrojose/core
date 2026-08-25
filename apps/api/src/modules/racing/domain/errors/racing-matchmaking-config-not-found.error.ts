import { DomainError } from '../../../../shared/errors/domain-error';

export class RacingMatchmakingConfigNotFoundError extends DomainError {
  constructor(key: string) {
    super(
      'RACING_MATCHMAKING_CONFIG_NOT_FOUND',
      `Parámetro de matchmaking ${key} no encontrado.`,
      { key },
    );
  }
}
