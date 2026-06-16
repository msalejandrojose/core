import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Request } from 'express';
import { AppException } from '../app.exception';
import { ERROR_CATALOG } from '../error-codes';

/** Token de inyección del cliente Prisma. */
export const ERROR_LOG_PRISMA_CLIENT = Symbol('ERROR_LOG_PRISMA_CLIENT');

/**
 * Mínimo contrato que el servicio necesita del cliente Prisma.
 * Tipado vía `unknown` + cast para no atar el módulo al cliente generado
 * en `src/generated/prisma`: el wiring real provee el cliente concreto.
 */
export interface ErrorLogPrismaLike {
  errorLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

/**
 * Persiste excepciones en la tabla `ErrorLog`.
 *
 * Idempotente por `errorId`: la columna es UNIQUE en Prisma, así que un
 * conflicto en una doble escritura se traga silenciosamente.
 *
 * Es un servicio "best-effort": cualquier fallo de persistencia se loguea
 * pero NO se propaga (el filter lo invoca fire-and-forget).
 */
@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  constructor(
    @Optional()
    @Inject(ERROR_LOG_PRISMA_CLIENT)
    private readonly prisma?: ErrorLogPrismaLike,
  ) {}

  async record(err: AppException, req?: Request): Promise<void> {
    if (!this.prisma) {
      // Wiring no completo todavía — solo log.
      this.logger.debug(
        `ErrorLog (no DB): ${err.errorId} ${err.code} ${err.message}`,
      );
      return;
    }

    const entry = ERROR_CATALOG[err.code];
    const userId =
      (req as Request & { user?: { id?: string } })?.user?.id ?? null;

    try {
      await this.prisma.errorLog.create({
        data: {
          errorId: err.errorId,
          code: err.code,
          level: err.level,
          httpStatus: entry.httpStatus,
          message: err.message,
          path: req?.url ?? null,
          method: req?.method ?? null,
          userId,
          context: err.context
            ? (err.context as unknown as Record<string, unknown>)
            : null,
          stack:
            err.level === 'error' || err.level === 'critical'
              ? (err.stack ?? null)
              : null,
        },
      });
    } catch (persistErr) {
      this.logger.error(
        `No se pudo persistir ErrorLog ${err.errorId}: ${
          persistErr instanceof Error ? persistErr.message : 'unknown'
        }`,
      );
    }
  }
}
