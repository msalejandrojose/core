// Catálogo centralizado de códigos de error de la API.
//
// Cada código tiene asociado un `httpStatus`, un `level` (severidad) y un
// `defaultMessage` en español. El `level` decide cómo se trata el error en
// los logs de Docker, en la tabla `ErrorLog` y en el frontend (ver
// `AppExceptionFilter` y el README de `apps/api`).
//
// Para añadir un código nuevo: agrega una entrada aquí con el formato
// `DOMINIO_SUBDOMINIO_CAUSA` y úsalo desde `AppException` o desde una
// subclase de `DomainError`. No hace falta tocar nada más — el filtro
// global resuelve `httpStatus`/`level`/`message` automáticamente a partir
// de esta tabla.

export type ErrorLevel = 'info' | 'warn' | 'error' | 'critical';

export interface ErrorCatalogEntry {
  readonly httpStatus: number;
  readonly level: ErrorLevel;
  readonly defaultMessage: string;
  readonly i18nKey?: string;
}

export const ERROR_CATALOG = {
  // Genéricos / fallback del filtro global
  INTERNAL_UNEXPECTED: {
    httpStatus: 500,
    level: 'critical',
    defaultMessage: 'Ha ocurrido un error inesperado.',
  },
  VALIDATION_FAILED: {
    httpStatus: 400,
    level: 'warn',
    defaultMessage: 'Los datos enviados no son válidos.',
  },

  // Auth / IAM
  INVALID_CREDENTIALS: {
    httpStatus: 401,
    level: 'warn',
    defaultMessage: 'Credenciales inválidas.',
  },
  INVALID_TOKEN: {
    httpStatus: 400,
    level: 'warn',
    defaultMessage: 'El token es inválido o ha expirado.',
  },
  EMAIL_NOT_VERIFIED: {
    httpStatus: 403,
    level: 'warn',
    defaultMessage: 'El email no ha sido verificado aún.',
  },
  FORBIDDEN: {
    httpStatus: 403,
    level: 'warn',
    defaultMessage: 'No tienes permisos para realizar esta acción.',
  },
  USER_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe un usuario con ese email.',
  },
  USER_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Usuario no encontrado.',
  },
  ROLE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Rol no encontrado.',
  },
  ROLE_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe un rol con ese código.',
  },
  ROLE_IN_USE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'El rol está en uso y no se puede eliminar.',
  },
  ROLE_SCOPE_MISMATCH: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'El ámbito del rol no coincide con el del usuario.',
  },
  API_SECTION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Sección de la API no encontrada.',
  },
  API_SECTION_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe una sección con ese código.',
  },
  API_SECTION_IN_USE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'La sección está en uso y no se puede eliminar.',
  },
  INVALID_HIERARCHY: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La jerarquía especificada no es válida.',
  },

  // Paginación
  INVALID_CURSOR: {
    httpStatus: 400,
    level: 'warn',
    defaultMessage: 'El cursor de paginación es inválido o ha sido modificado.',
  },

  // Blog
  POST_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Post no encontrado.',
  },
  SLUG_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe un elemento con ese slug.',
  },
  CATEGORY_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Categoría no encontrada.',
  },
  TAG_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Etiqueta no encontrada.',
  },
  INVALID_POST_TRANSITION: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La transición de estado del post no está permitida.',
  },

  // Workflows
  WORKFLOW_DSL_INVALID: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La definición del workflow (DSL) no es válida.',
  },
  WORKFLOW_DEFINITION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Definición de workflow no encontrada.',
  },
  WORKFLOW_VERSION_CONFLICT: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe esa versión del workflow.',
  },
  WORKFLOW_RUN_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Run de workflow no encontrado.',
  },
  ACTION_HANDLER_NOT_FOUND: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'No hay handler registrado para esa acción.',
  },
  TARGET_RESOLVER_NOT_FOUND: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'No hay resolver registrado para ese tipo de target.',
  },

  // Mailer
  MAIL_PROVIDER_UNAVAILABLE: {
    httpStatus: 502,
    level: 'error',
    defaultMessage: 'No se pudo enviar el correo. Inténtalo más tarde.',
  },

  // Dynamic forms
  FORM_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Formulario no encontrado.',
  },
  FORM_INSTANCE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Instancia de formulario no encontrada.',
  },
  FORM_RESPONSE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Respuesta no encontrada.',
  },
  FORM_SCHEMA_INVALID: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'El schema del formulario no es válido.',
  },
  FORM_INSTANCE_CLOSED: {
    httpStatus: 410,
    level: 'warn',
    defaultMessage: 'Este formulario ya no está disponible.',
  },
  FORM_RESPONSE_DUPLICATE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya has enviado una respuesta a este formulario.',
  },
  FORM_RESPONSE_LIMIT_REACHED: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage:
      'Este formulario ha alcanzado el número máximo de respuestas.',
  },

  // Sections (UI navigation tree)
  SECTION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Sección no encontrada.',
  },
  SECTION_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe una sección con ese código en ese scope.',
  },
  SECTION_CYCLE: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La jerarquía crearía un ciclo.',
  },
  SECTION_SCOPE_MISMATCH: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'El scope del hijo no es compatible con el del padre.',
  },
  SECTION_IN_USE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'La sección tiene subsecciones activas.',
  },
} as const satisfies Record<string, ErrorCatalogEntry>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function getErrorCatalogEntry(code: string): ErrorCatalogEntry {
  return (
    (ERROR_CATALOG as Record<string, ErrorCatalogEntry>)[code] ??
    ERROR_CATALOG.INTERNAL_UNEXPECTED
  );
}
