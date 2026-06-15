import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../modules/iam/domain/errors/domain-error';

// Mapeo de código de error de dominio → HTTP status.
const ERROR_CODE_TO_HTTP: Record<string, number> = {
  USER_ALREADY_EXISTS: HttpStatus.CONFLICT,
  USER_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  ROLE_NOT_FOUND: HttpStatus.NOT_FOUND,
  ROLE_ALREADY_EXISTS: HttpStatus.CONFLICT,
  ROLE_IN_USE: HttpStatus.CONFLICT,
  ROLE_SCOPE_MISMATCH: HttpStatus.UNPROCESSABLE_ENTITY,
  API_SECTION_NOT_FOUND: HttpStatus.NOT_FOUND,
  API_SECTION_ALREADY_EXISTS: HttpStatus.CONFLICT,
  API_SECTION_IN_USE: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  INVALID_HIERARCHY: HttpStatus.UNPROCESSABLE_ENTITY,
  // Email / auth tokens
  INVALID_TOKEN: HttpStatus.BAD_REQUEST,
  EMAIL_NOT_VERIFIED: HttpStatus.FORBIDDEN,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(error: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = ERROR_CODE_TO_HTTP[error.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;

    if (status >= 500) {
      this.logger.error(error.message, error.stack);
    }

    response.status(status).json({
      statusCode: status,
      code: error.code,
      message: error.message,
    });
  }
}
