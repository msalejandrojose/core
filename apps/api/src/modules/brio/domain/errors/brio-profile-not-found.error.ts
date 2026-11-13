import { DomainError } from '../../../../shared/errors/domain-error';

// El usuario autenticado todavía no ha completado el onboarding de Brío. La
// app lo trata como "llévame al onboarding", no como un fallo.
export class BrioProfileNotFoundError extends DomainError {
  constructor(userId: string) {
    super(
      'BRIO_PROFILE_NOT_FOUND',
      'Todavía no has configurado tu perfil de actividad.',
      { userId },
    );
  }
}
