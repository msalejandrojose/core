import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  TOKEN_ISSUER,
  type AccessTokenPayload,
  type TokenIssuerPort,
} from '../../../application/ports/token-issuer.port';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// `express.Request` no incluye `.user` de serie. Definimos un tipo local en
// lugar de usar declaration merging sobre `express-serve-static-core`, que
// no resuelve con `moduleResolution: nodenext`.
export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Si el endpoint (o su controller) está marcado como público, salta.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = header.slice('Bearer '.length).trim();

    try {
      req.user = await this.tokens.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
