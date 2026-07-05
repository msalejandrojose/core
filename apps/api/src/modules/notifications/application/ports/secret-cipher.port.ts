export const SECRET_CIPHER = Symbol('NOTIFICATIONS_SECRET_CIPHER');

// Cifra/descifra valores secretos (credenciales de las cuentas) en reposo. La
// implementación vive en infraestructura (AES-256-GCM con `NOTIFICATIONS_ENC_KEY`).
export interface SecretCipherPort {
  encrypt(plain: string): string;
  decrypt(cipher: string): string;
  /** True si `value` tiene el formato de un texto ya cifrado por este cipher. */
  isEncrypted(value: string): boolean;
}
