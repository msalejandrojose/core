import { DomainError } from '../../../../shared/errors/domain-error';

export class SectionScopeMismatchError extends DomainError {
  constructor(childScope: string, parentScope: string) {
    super(
      'SECTION_SCOPE_MISMATCH',
      `El scope del hijo (${childScope}) no es compatible con el del padre (${parentScope}).`,
      { childScope, parentScope },
    );
  }
}
