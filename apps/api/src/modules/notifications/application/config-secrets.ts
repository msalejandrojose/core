import type { FieldDescriptor } from '../domain/channels/field-descriptor';
import { secretFieldKeys } from '../domain/channels/channel-catalog';
import type { SecretCipherPort } from './ports/secret-cipher.port';

// Marcador que la API devuelve en lugar de un secreto. Si en un update el
// cliente reenvía este valor, se interpreta como "no lo cambies".
export const MASK = '••••••••';

// Cifra los campos secretos de una config antes de persistir. Un secreto ya
// cifrado (p. ej. en un update parcial que no lo toca) se deja como está.
export function encryptConfigSecrets(
  config: Record<string, unknown>,
  fields: FieldDescriptor[],
  cipher: SecretCipherPort,
): Record<string, unknown> {
  const secrets = new Set(secretFieldKeys(fields));
  const out: Record<string, unknown> = { ...config };
  for (const key of secrets) {
    const value = out[key];
    if (
      typeof value === 'string' &&
      value !== '' &&
      !cipher.isEncrypted(value)
    ) {
      out[key] = cipher.encrypt(value);
    }
  }
  return out;
}

// Descifra los campos secretos para poder usarlos en el envío.
export function decryptConfigSecrets(
  config: Record<string, unknown>,
  fields: FieldDescriptor[],
  cipher: SecretCipherPort,
): Record<string, unknown> {
  const secrets = new Set(secretFieldKeys(fields));
  const out: Record<string, unknown> = { ...config };
  for (const key of secrets) {
    const value = out[key];
    if (typeof value === 'string' && cipher.isEncrypted(value)) {
      out[key] = cipher.decrypt(value);
    }
  }
  return out;
}

// Enmascara los campos secretos para exponerlos por la API sin filtrarlos.
export function maskConfigSecrets(
  config: Record<string, unknown>,
  fields: FieldDescriptor[],
): Record<string, unknown> {
  const secrets = new Set(secretFieldKeys(fields));
  const out: Record<string, unknown> = { ...config };
  for (const key of secrets) {
    if (out[key] !== undefined && out[key] !== null && out[key] !== '') {
      out[key] = MASK;
    }
  }
  return out;
}
