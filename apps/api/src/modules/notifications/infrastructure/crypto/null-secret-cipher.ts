import type { SecretCipherPort } from '../../application/ports/secret-cipher.port';

// Cipher identidad para dev/CI cuando no hay `NOTIFICATIONS_ENC_KEY`. NO cifra
// (los secretos quedan en claro en BBDD): solo desbloquea el arranque en
// entornos donde el cifrado real es opcional. En prod la clave es obligatoria.
export class NullSecretCipher implements SecretCipherPort {
  encrypt(plain: string): string {
    return plain;
  }
  decrypt(value: string): string {
    return value;
  }
  isEncrypted(): boolean {
    // Nada está "cifrado": así los helpers no intentan descifrar/re-cifrar.
    return false;
  }
}
