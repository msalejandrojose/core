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
  SOCIAL_AUTH_FAILED: {
    httpStatus: 401,
    level: 'warn',
    defaultMessage: 'No se pudo verificar el inicio de sesión social.',
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
  WORKFLOW_RUN_NOT_RETRYABLE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Solo se puede reintentar un run fallido.',
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
  FORM_RESPONSE_INVALID: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'Las respuestas del formulario no son válidas.',
  },
  FIELD_OPTIONS_ENTITY_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'No existe un repositorio de opciones para esa entidad.',
  },
  FIELD_OPTION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Opción no encontrada.',
  },
  ASYNC_VALIDATOR_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'No existe ese validador asíncrono.',
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

  // Leads
  LEAD_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Lead no encontrado.',
  },
  LEAD_TAG_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Etiqueta de lead no encontrada.',
  },
  INVALID_LEAD_TRANSITION: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La transición de estado del lead no está permitida.',
  },

  // Plazza — plazas de parking (módulo `parking`)
  PARKING_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Plaza no encontrada.',
  },
  INVALID_PARKING_TRANSITION: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La transición de estado de la plaza no está permitida.',
  },
  PARKING_PHOTO_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Foto no encontrada en la plaza.',
  },
  PARKING_PHOTO_SOURCE_INVALID: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'El archivo no está disponible para usarse como foto.',
  },
  RESERVATION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Reserva no encontrada.',
  },
  PARKING_NOT_BOOKABLE: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La plaza no existe o no está disponible para reservar.',
  },
  PARKING_NOT_AVAILABLE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage:
      'La plaza no está disponible en el rango de fechas solicitado.',
  },
  RESERVATION_DATE_RANGE_INVALID: {
    httpStatus: 400,
    level: 'warn',
    defaultMessage: 'La fecha de fin debe ser posterior a la fecha de inicio.',
  },
  INVALID_RESERVATION_TRANSITION: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La transición de estado de la reserva no está permitida.',
  },
  HOST_VERIFICATION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Verificación de host no encontrada.',
  },
  HOST_VERIFICATION_DOCUMENT_INVALID: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage:
      'El archivo no está disponible para usarse como documento de verificación.',
  },
  INVALID_HOST_VERIFICATION_TRANSITION: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage:
      'La transición de estado de la verificación de host no está permitida.',
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

  // Notifications (cuentas de envío + tipos de mensaje)
  SENDING_ACCOUNT_TYPE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Tipo de cuenta de envío no encontrado.',
  },
  SENDING_ACCOUNT_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Cuenta de envío no encontrada.',
  },
  MESSAGE_TYPE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Tipo de mensaje no encontrado.',
  },
  DELIVERY_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Envío no encontrado.',
  },
  WEBHOOK_EVENT_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Evento de webhook no encontrado.',
  },
  WEBHOOK_EVENT_NOT_REPROCESSABLE: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Este evento ya se ha procesado correctamente.',
  },

  // Localización / Geografía (módulo `geo`)
  COUNTRY_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'País no encontrado.',
  },
  COUNTRY_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe un país con ese código ISO.',
  },
  REGION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Comunidad autónoma no encontrada.',
  },
  REGION_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage:
      'Ya existe una comunidad autónoma con ese código en el país.',
  },
  PROVINCE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Provincia no encontrada.',
  },
  PROVINCE_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe una provincia con ese código en el país.',
  },
  MUNICIPALITY_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Municipio no encontrado.',
  },
  MUNICIPALITY_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe un municipio con ese código en la provincia.',
  },
  POSTAL_CODE_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Código postal no encontrado.',
  },
  POSTAL_CODE_ALREADY_EXISTS: {
    httpStatus: 409,
    level: 'warn',
    defaultMessage: 'Ya existe ese código postal en el municipio.',
  },

  INVALID_ACCOUNT_CONFIG: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'La configuración de la cuenta de envío no es válida.',
  },
  INVALID_MESSAGE_CONTENT: {
    httpStatus: 422,
    level: 'warn',
    defaultMessage: 'El contenido del tipo de mensaje no es válido.',
  },
  CHANNEL_NOT_SUPPORTED: {
    httpStatus: 422,
    level: 'error',
    defaultMessage: 'No hay dispatcher para el canal de la cuenta.',
  },
  NOTIFICATION_DELIVERY_FAILED: {
    httpStatus: 502,
    level: 'error',
    defaultMessage: 'No se pudo entregar la notificación.',
  },
  NOTIFICATION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Notificación no encontrada.',
  },

  // WhatsApp (bandeja de conversaciones)
  WHATSAPP_CONVERSATION_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Conversación de WhatsApp no encontrada.',
  },
  WHATSAPP_ACCOUNT_NOT_FOUND: {
    httpStatus: 404,
    level: 'warn',
    defaultMessage: 'Cuenta de WhatsApp no encontrada o sin configurar.',
  },
  WHATSAPP_SEND_FAILED: {
    httpStatus: 502,
    level: 'error',
    defaultMessage: 'No se pudo enviar el mensaje de WhatsApp.',
  },
} as const satisfies Record<string, ErrorCatalogEntry>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function getErrorCatalogEntry(code: string): ErrorCatalogEntry {
  return (
    (ERROR_CATALOG as Record<string, ErrorCatalogEntry>)[code] ??
    ERROR_CATALOG.INTERNAL_UNEXPECTED
  );
}
