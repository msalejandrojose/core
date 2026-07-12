import { DomainError } from '../../../../shared/errors/domain-error';
import { SiteEntryStatus } from '../value-objects/site-entry-status.vo';

// Transición de estado no soportada (ver domain/site-entry/status-transition.ts
// — p.ej. VISITED → WANT_TO_GO no existe en el MVP).
export class InvalidSiteEntryTransitionError extends DomainError {
  constructor(from: SiteEntryStatus | null, to: SiteEntryStatus) {
    super(
      'ANDANZAS_INVALID_SITE_ENTRY_TRANSITION',
      `No se puede pasar de "${from ?? 'sin entry'}" a "${to}".`,
      { from, to },
    );
  }
}
