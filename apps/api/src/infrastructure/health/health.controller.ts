import {
  Controller,
  Get,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../modules/iam/infrastructure/http/decorators/public.decorator';
import { PrismaService } from '../database/prisma/prisma.service';

// Endpoints de salud para los probes del cloud (Cloud Run, ECS, Fly…).
// Van marcados con `@Public()` porque el `JwtAuthGuard` global deja privada
// toda la API por defecto; los probes llegan sin token. `@SkipThrottle()` los
// exime del rate limiting: los probes son frecuentes y no deben consumir cupo.
@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  // Readiness — ¿puede la API atender tráfico? Comprueba que la conexión a la
  // BBDD responde (`SELECT 1`). Es el endpoint al que apuntan los readiness
  // probes: 200 si todo va, 503 si algún check falla (retirando la instancia
  // del balanceador hasta que se recupere). Aquí se irán sumando otras
  // dependencias críticas (S3, colas…) si deben bloquear el tráfico.
  //
  // Terminus lanza `ServiceUnavailableException(result)` cuando algo está caído.
  // La capturamos para devolver su cuerpo `{status, error, details}` tal cual y
  // evitar que el `AppExceptionFilter` global lo reescriba a su envelope de
  // error genérico (y registre un ErrorLog en cada probe fallido).
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check — verifica la BBDD' })
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.db.pingCheck('database', this.prisma),
      ]);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        res.status(error.getStatus());
        return error.getResponse() as HealthCheckResult;
      }
      throw error;
    }
  }

  // Liveness — ¿está vivo el proceso? A propósito NO toca dependencias externas:
  // un fallo transitorio de la BBDD no debe hacer que el orquestador reinicie el
  // contenedor (eso es trabajo del readiness). Responde 200 mientras el event
  // loop siga atendiendo peticiones.
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness check — el proceso responde' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
