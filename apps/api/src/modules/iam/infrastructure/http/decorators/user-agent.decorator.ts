import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * User-Agent de la petición (para reconocer el dispositivo de una sesión). Se
 * lee con un decorador propio y no con `@Headers('user-agent')` para que no
 * aparezca como cabecera obligatoria en el OpenAPI ni en el cliente tipado.
 */
export const UserAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<Request>().headers['user-agent'],
);
