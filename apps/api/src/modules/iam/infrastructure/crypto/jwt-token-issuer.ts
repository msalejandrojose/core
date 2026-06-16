import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenPayload,
  TokenIssuerPort,
} from '../../application/ports/token-issuer.port';

// Implementa `TokenIssuerPort` delegando en el JwtService de `@nestjs/jwt`.
// El secreto y el expiresIn se configuran al registrar JwtModule en
// `iam.module.ts`. Aquí solo lo usamos.
@Injectable()
export class JwtTokenIssuer implements TokenIssuerPort {
  constructor(private readonly jwt: JwtService) {}

  issue(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    // `verifyAsync` lanza JsonWebTokenError / TokenExpiredError si el token
    // no es válido. El guard se encarga de mapear a UnauthorizedException.
    const decoded = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    return {
      sub: decoded.sub,
      email: decoded.email,
      userType: decoded.userType,
    };
  }
}
