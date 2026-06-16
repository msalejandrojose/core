import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type AccessTokenPayload } from '../../../application/ports/token-issuer.port';
import { type AuthenticatedRequest } from '../guards/jwt-auth.guard';

// `@CurrentUser()` inyecta el payload del JWT en el parámetro. Solo es
// válido en endpoints protegidos por `@Auth()`; en endpoints públicos
// devolverá `undefined`.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user;
  },
);
