import { verify as cryptoVerify, type KeyObject } from 'node:crypto';

// Ver Apple: "Verifying a player's identity" — el cliente (plugin
// `gamecenter` en Godot) pide `request_identity_verification_signature()` y
// manda estos 6 campos al servidor.
export interface GameCenterVerificationPayload {
  playerId: string;
  bundleId: string;
  /** Milisegundos desde epoch, tal cual lo da el SDK de Apple. */
  timestamp: number;
  /** Base64. */
  signature: string;
  /** Base64. */
  salt: string;
  publicKeyUrl: string;
}

// Solo Apple puede firmar un payload de Game Center válido — sin esto, un
// atacante podría mandar su propia URL, autofirmar el payload con su propia
// clave, y suplantar a cualquier playerId. Apple sirve el certificado desde
// subdominios de apple.com (p.ej. `static.gc.apple.com`).
export function isAppleGameCenterHost(publicKeyUrl: string): boolean {
  let host: string;
  try {
    host = new URL(publicKeyUrl).hostname;
  } catch {
    return false;
  }
  return host === 'apple.com' || host.endsWith('.apple.com');
}

// Verificación pura de la firma: reconstruye el payload firmado exactamente
// como lo describe Apple (playerId + bundleId + timestamp de 8 bytes
// big-endian + salt) y comprueba la firma RSA-SHA256 contra la clave pública
// YA EXTRAÍDA del certificado (la descarga y el parseo del certificado viven
// en el adaptador de infraestructura — aquí no hay red ni X.509, solo bytes y
// crypto, para que sea testeable con un par de claves generado en el test).
export function verifyGameCenterSignature(
  payload: GameCenterVerificationPayload,
  publicKey: KeyObject,
): boolean {
  let salt: Buffer;
  let signature: Buffer;
  try {
    salt = Buffer.from(payload.salt, 'base64');
    signature = Buffer.from(payload.signature, 'base64');
  } catch {
    return false;
  }

  const timestampBuf = Buffer.alloc(8);
  try {
    timestampBuf.writeBigUInt64BE(BigInt(Math.trunc(payload.timestamp)));
  } catch {
    return false;
  }

  const signedData = Buffer.concat([
    Buffer.from(payload.playerId, 'utf8'),
    Buffer.from(payload.bundleId, 'utf8'),
    timestampBuf,
    salt,
  ]);

  try {
    return cryptoVerify('RSA-SHA256', signedData, publicKey, signature);
  } catch {
    return false;
  }
}
