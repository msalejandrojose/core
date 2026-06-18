// Los errores de dominio de IAM extienden el `DomainError` COMPARTIDO
// (`src/shared/errors/domain-error.ts`) para que el filtro global
// `AppExceptionFilter` los reconozca vía `instanceof` y los traduzca a partir
// del catálogo de errores. Se mantiene este archivo como punto de import
// estable para el módulo (acepta `code`, `message` y `context` opcional).
export { DomainError } from '../../../../shared/errors/domain-error';
