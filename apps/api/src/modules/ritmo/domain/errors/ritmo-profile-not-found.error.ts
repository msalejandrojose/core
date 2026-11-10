import { DomainError } from '../../../../shared/errors/domain-error';

// El usuario autenticado todavía no ha completado el onboarding de Ritmo. La
// app lo trata como "llévame al onboarding", no como un fallo.
export class RitmoProfileNotFoundError extends DomainError {
  constructor(userId: string) {
    super(
      'RITMO_PROFILE_NOT_FOUND',
      'Todavía no has configurado tu perfil de actividad.',
      { userId },
    );
  }
}
