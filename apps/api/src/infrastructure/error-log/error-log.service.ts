import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type { ErrorLevel } from '../../shared/errors/error-catalog';

export interface ErrorLogEntry {
  errorId: string;
  code: string;
  level: ErrorLevel;
  httpStatus: number;
  message: string;
  path?: string;
  method?: string;
  userId?: string;
  context?: Record<string, unknown>;
  stack?: string;
}

// Persiste errores en la tabla `ErrorLog` para auditoría/análisis. Lo invoca
// `AppExceptionFilter` de forma asíncrona (sin `await` en el filtro) para no
// bloquear la respuesta al cliente; si la escritura falla, solo se loggea —
// nunca debe tirar abajo el manejo de errores en sí.
@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: ErrorLogEntry): Promise<void> {
    try {
      await this.prisma.errorLog.create({
        data: {
          errorId: entry.errorId,
          code: entry.code,
          level: entry.level,
          httpStatus: entry.httpStatus,
          message: entry.message,
          path: entry.path,
          method: entry.method,
          userId: entry.userId,
          context: entry.context as Prisma.InputJsonValue | undefined,
          stack: entry.stack,
        },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo persistir el ErrorLog ${entry.errorId}: ${String(err)}`,
      );
    }
  }
}
