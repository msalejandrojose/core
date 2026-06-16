// Base para errores de dominio. Vive en `shared/` (no en un módulo concreto)
// porque varios módulos la reutilizan, pero deliberadamente NO depende de
// Nest/HTTP/Prisma: la capa `domain/` de cada módulo debe poder lanzarla sin
// conocer cómo se traduce a una respuesta HTTP. Esa traducción (httpStatus,
// level, errorId...) vive en `AppExceptionFilter` + el catálogo de errores.
export abstract class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
