import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidAccountConfigError extends DomainError {
  constructor(reason: string) {
    super(
      'INVALID_ACCOUNT_CONFIG',
      `Config de la cuenta inválida: ${reason}.`,
      {
        reason,
      },
    );
  }
}
