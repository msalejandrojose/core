/**
 * Catálogo cerrado de códigos de error de la API.
 *
 * Convención de nomenclatura: `DOMINIO_SUBDOMINIO_CAUSA` en SCREAMING_SNAKE_CASE.
 *   - DOMINIO: módulo o área (AUTH, USER, MAIL, INTERNAL…)
 *   - SUBDOMINIO: subárea u operación (LOGIN, REGISTER, PROVIDER…)
 *   - CAUSA: motivo concreto (INVALID_CREDENTIALS, NOT_FOUND, UNAVAILABLE…)
 *
 * Cada entrada del catálogo declara:
 *   - httpStatus: código HTTP que devuelve el filter al cliente
 *   - level:      severidad (define logging + persistencia + UI)
 *   - defaultMessage: mensaje en español usado si no se provee uno custom
 *   - i18nKey (opcional): clave para resolver el mensaje en el frontend
 *
 * Añadir un código nuevo:
 *   1) Añadir constante a `ERROR_CODES`.
 *   2) Añadir entrada al `ERROR_CATALOG`.
 *   3) Usarlo desde un `AppException` o subclase.
 */

import { HttpStatus } from '@nestjs/common';

export type ErrorLevel = 'info' | 'warn' | 'error' | 'critical';

export interface ErrorCatalogEntry {
  httpStatus: number;
  level: ErrorLevel;
  defaultMessage: string;
  i18nKey?: string;
}

/** Códigos de error tipados. Único punto de verdad para `code`. */
export const ERROR_CODES = {
  // ----- AUTH -----
  AUTH_LOGIN_INVALID_CREDENTIALS: 'AUTH_LOGIN_INVALID_CREDENTIALS',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',

  // ----- USER -----
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EMAIL_ALREADY_EXISTS: 'USER_EMAIL_ALREADY_EXISTS',

  // ----- VALIDATION -----
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // ----- MAIL -----
  MAIL_PROVIDER_UNAVAILABLE: 'MAIL_PROVIDER_UNAVAILABLE',

  // ----- PAGINATION -----
  PAGINATION_INVALID_CURSOR: 'PAGINATION_INVALID_CURSOR',

  // ----- INTERNAL -----
  /** Catch-all para errores no controlados (5xx). El filter lo asigna. */
  INTERNAL_UNEXPECTED: 'INTERNAL_UNEXPECTED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_CATALOG: Record<ErrorCode, ErrorCatalogEntry> = {
  [ERROR_CODES.AUTH_LOGIN_INVALID_CREDENTIALS]: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    level: 'warn',
    defaultMessage: 'Credenciales inválidas.',
    i18nKey: 'errors.auth.invalidCredentials',
  },
  [ERROR_CODES.AUTH_TOKEN_INVALID]: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    level: 'warn',
    defaultMessage: 'El token de autenticación es inválido.',
    i18nKey: 'errors.auth.tokenInvalid',
  },
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    level: 'warn',
    defaultMessage: 'El token de autenticación ha expirado.',
    i18nKey: 'errors.auth.tokenExpired',
  },
  [ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED]: {
    httpStatus: HttpStatus.FORBIDDEN,
    level: 'warn',
    defaultMessage: 'El email no ha sido verificado.',
    i18nKey: 'errors.auth.emailNotVerified',
  },
  [ERROR_CODES.USER_NOT_FOUND]: {
    httpStatus: HttpStatus.NOT_FOUND,
    level: 'warn',
    defaultMessage: 'Usuario no encontrado.',
    i18nKey: 'errors.user.notFound',
  },
  [ERROR_CODES.USER_EMAIL_ALREADY_EXISTS]: {
    httpStatus: HttpStatus.CONFLICT,
    level: 'warn',
    defaultMessage: 'Ya existe un usuario con ese email.',
    i18nKey: 'errors.user.emailAlreadyExists',
  },
  [ERROR_CODES.VALIDATION_FAILED]: {
    httpStatus: HttpStatus.BAD_REQUEST,
    level: 'warn',
    defaultMessage: 'Los datos enviados no son válidos.',
    i18nKey: 'errors.validation.failed',
  },
  [ERROR_CODES.MAIL_PROVIDER_UNAVAILABLE]: {
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    level: 'error',
    defaultMessage: 'El proveedor de email no está disponible temporalmente.',
    i18nKey: 'errors.mail.providerUnavailable',
  },
  [ERROR_CODES.PAGINATION_INVALID_CURSOR]: {
    httpStatus: HttpStatus.BAD_REQUEST,
    level: 'warn',
    defaultMessage: 'El cursor de paginación es inválido.',
    i18nKey: 'errors.pagination.invalidCursor',
  },
  [ERROR_CODES.INTERNAL_UNEXPECTED]: {
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    level: 'critical',
    defaultMessage: 'Error interno inesperado.',
    i18nKey: 'errors.internal.unexpected',
  },
};

/** Helper: obtener la entrada del catálogo a partir de un código. */
export function getErrorCatalogEntry(code: ErrorCode): ErrorCatalogEntry {
  return ERROR_CATALOG[code];
}
