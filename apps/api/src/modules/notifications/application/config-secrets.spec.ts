import { randomBytes } from 'node:crypto';
import type { FieldDescriptor } from '../domain/channels/field-descriptor';
import { AesSecretCipher } from '../infrastructure/crypto/aes-secret-cipher';
import {
  decryptConfigSecrets,
  encryptConfigSecrets,
  maskConfigSecrets,
  MASK,
} from './config-secrets';

const fields: FieldDescriptor[] = [
  { key: 'fromEmail', label: 'E', type: 'email' },
  { key: 'apiKey', label: 'K', type: 'text', secret: true },
];

describe('config-secrets', () => {
  const cipher = new AesSecretCipher(randomBytes(32).toString('hex'));

  it('cifra solo los campos secretos', () => {
    const enc = encryptConfigSecrets(
      { fromEmail: 'a@b.com', apiKey: 're_123' },
      fields,
      cipher,
    );
    expect(enc.fromEmail).toBe('a@b.com');
    expect(cipher.isEncrypted(enc.apiKey as string)).toBe(true);
  });

  it('no re-cifra un secreto ya cifrado', () => {
    const once = encryptConfigSecrets({ apiKey: 're_123' }, fields, cipher);
    const twice = encryptConfigSecrets(once, fields, cipher);
    expect(twice.apiKey).toBe(once.apiKey);
  });

  it('descifra los secretos', () => {
    const enc = encryptConfigSecrets({ apiKey: 're_123' }, fields, cipher);
    const dec = decryptConfigSecrets(enc, fields, cipher);
    expect(dec.apiKey).toBe('re_123');
  });

  it('enmascara los secretos presentes', () => {
    const masked = maskConfigSecrets(
      { fromEmail: 'a@b.com', apiKey: 'algo' },
      fields,
    );
    expect(masked.fromEmail).toBe('a@b.com');
    expect(masked.apiKey).toBe(MASK);
  });
});
