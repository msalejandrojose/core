import { DomainError } from '../../../../shared/errors/domain-error';

// Envuelve el rechazo de `validateTrackPath` para que las capas de aplicación
// no tengan que traducir a mano el resultado `{ ok: false, reason, details }`
// a una excepción — se reutiliza la validación del dominio, no se duplica.
export class InvalidTrackPathError extends DomainError {
  constructor(reason: string, details: Record<string, unknown>) {
    super('RACING_INVALID_TRACK_PATH', `Trazado inválido: ${reason}.`, details);
  }
}
