import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasherPort } from '../../application/ports/password-hasher.port';

// Argon2id es el ganador del Password Hashing Competition y la recomendación
// actual del OWASP. Parámetros por defecto de la lib `argon2` (timeCost=3,
// memoryCost=65536, parallelism=4) son razonables para servidor.
@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
