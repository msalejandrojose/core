import { DomainError } from '../../../../shared/errors/domain-error';

export class TargetResolverNotFoundError extends DomainError {
  constructor(type: string) {
    super(
      'TARGET_RESOLVER_NOT_FOUND',
      `No hay resolver registrado para el target "${type}".`,
      { type },
    );
  }
}
