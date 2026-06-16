import { UserType } from '../../domain/entities/user.entity';

export const TOKEN_ISSUER = Symbol('IAM_TOKEN_ISSUER');

// Payload mínimo del access token. `sub` es el id del usuario por convención JWT.
// Mantenerlo pequeño: solo lo imprescindible para autenticación. Datos
// adicionales se piden a la BBDD.
export interface AccessTokenPayload {
  sub: string;
  email: string;
  userType: UserType;
}

export interface TokenIssuerPort {
  issue(payload: AccessTokenPayload): Promise<string>;
  verify(token: string): Promise<AccessTokenPayload>;
}
