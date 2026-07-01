import { DomainError } from '../../../../shared/errors/domain-error';

export class SectionCycleError extends DomainError {
  constructor() {
    super('SECTION_CYCLE', 'La jerarquía crearía un ciclo.');
  }
}
