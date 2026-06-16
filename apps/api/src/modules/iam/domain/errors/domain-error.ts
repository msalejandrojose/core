// Base class para errores de dominio. Permite que un único exception filter
// en `shared/filters/` los mapee a respuestas HTTP sin que el dominio
// dependa de Nest.
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
