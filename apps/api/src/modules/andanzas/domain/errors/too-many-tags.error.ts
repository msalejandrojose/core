import { DomainError } from '../../../../shared/errors/domain-error';

export class TooManyTagsError extends DomainError {
  constructor(count: number, max: number) {
    super(
      'ANDANZAS_TOO_MANY_TAGS',
      `Un sitio admite como máximo ${max} etiquetas (se enviaron ${count}).`,
      { count, max },
    );
  }
}
