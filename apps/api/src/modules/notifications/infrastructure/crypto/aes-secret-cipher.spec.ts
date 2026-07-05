import { randomBytes } from 'node:crypto';
import { AesSecretCipher } from './aes-secret-cipher';

describe('AesSecretCipher', () => {
  const key = randomBytes(32).toString('hex');
  const cipher = new AesSecretCipher(key);

  it('cifra y descifra (roundtrip)', () => {
    const secret = 're_live_abc123';
    const enc = cipher.encrypt(secret);
    expect(enc).not.toBe(secret);
    expect(cipher.isEncrypted(enc)).toBe(true);
    expect(cipher.decrypt(enc)).toBe(secret);
  });

  it('isEncrypted es false para texto plano', () => {
    expect(cipher.isEncrypted('plano')).toBe(false);
  });

  it('cada cifrado usa IV distinto', () => {
    expect(cipher.encrypt('x')).not.toBe(cipher.encrypt('x'));
  });

  it('un texto manipulado falla al descifrar (GCM autenticado)', () => {
    const enc = cipher.encrypt('secreto');
    const tampered = enc.slice(0, -4) + 'AAAA';
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('rechaza claves de longitud incorrecta', () => {
    expect(() => new AesSecretCipher('corta')).toThrow();
  });

  it('acepta clave base64 de 32 bytes', () => {
    const b64 = randomBytes(32).toString('base64');
    expect(() => new AesSecretCipher(b64)).not.toThrow();
  });
});
