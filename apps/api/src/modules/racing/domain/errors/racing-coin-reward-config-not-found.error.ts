import { DomainError } from '../../../../shared/errors/domain-error';

export class RacingCoinRewardConfigNotFoundError extends DomainError {
  constructor(key: string) {
    super(
      'RACING_COIN_REWARD_CONFIG_NOT_FOUND',
      `Importe de bono ${key} no encontrado.`,
      { key },
    );
  }
}
