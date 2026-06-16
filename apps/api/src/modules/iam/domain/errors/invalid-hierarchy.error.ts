import { DomainError } from './domain-error';

// Para self-FK que crean ciclos (rol padre de sí mismo a través de cadena,
// sección padre de sí misma).
export class InvalidHierarchyError extends DomainError {
  constructor(message: string) {
    super('INVALID_HIERARCHY', message);
  }
}
