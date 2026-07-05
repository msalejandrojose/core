import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SecretCipherPort } from '../../application/ports/secret-cipher.port';

const PREFIX = 'enc.v1.';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

// Cifrado autenticado AES-256-GCM. Formato del texto cifrado:
//   enc.v1.<iv-b64>.<tag-b64>.<ciphertext-b64>
// La clave (32 bytes) viene de `NOTIFICATIONS_ENC_KEY` (hex de 64 chars o
// base64 que decodifique a 32 bytes).
export class AesSecretCipher implements SecretCipherPort {
  private readonly key: Buffer;

  constructor(rawKey: string) {
    this.key = AesSecretCipher.parseKey(rawKey);
  }

  static parseKey(rawKey: string): Buffer {
    const hex = /^[0-9a-fA-F]{64}$/.test(rawKey)
      ? Buffer.from(rawKey, 'hex')
      : null;
    const key = hex ?? Buffer.from(rawKey, 'base64');
    if (key.length !== 32) {
      throw new Error(
        'NOTIFICATIONS_ENC_KEY debe decodificar a 32 bytes (hex de 64 chars o base64).',
      );
    }
    return key;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) return value;
    const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split('.');
    const decipher = createDecipheriv(
      ALGO,
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);
    return pt.toString('utf8');
  }

  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }
}
