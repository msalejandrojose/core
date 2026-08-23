import { DomainError } from '../../../../shared/errors/domain-error';

export class RacingLeagueConfigNotFoundError extends DomainError {
  constructor(key: string) {
    super(
      'RACING_LEAGUE_CONFIG_NOT_FOUND',
      `Parámetro de liga ${key} no encontrado.`,
      { key },
    );
  }
}
