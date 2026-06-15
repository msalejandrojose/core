import { DomainError } from './domain-error';

// Para self-FK que crean ciclos (rol padre de sí mismo a través de cadena,
// sección padre de sí misma).
export class InvalidHierarchyError extends DomainError {
  readonly code = 'INVALID_HIERARCHY';

  constructor(message: string) {
    super(message);
  }
}
