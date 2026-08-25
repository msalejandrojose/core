import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import {
  isAppleGameCenterHost,
  verifyGameCenterSignature,
  type GameCenterVerificationPayload,
} from './verify-game-center-signature';

// Sin fixtures ni red: genera un par de claves RSA de verdad y firma el
// payload exactamente como lo haría Apple, para probar la verificación
// contra una firma real en vez de un mock.
function signPayload(
  payload: Omit<GameCenterVerificationPayload, 'signature'>,
  privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'],
): string {
  const timestampBuf = Buffer.alloc(8);
  timestampBuf.writeBigUInt64BE(BigInt(payload.timestamp));
  const signedData = Buffer.concat([
    Buffer.from(payload.playerId, 'utf8'),
    Buffer.from(payload.bundleId, 'utf8'),
    timestampBuf,
    Buffer.from(payload.salt, 'base64'),
  ]);
  return cryptoSign('RSA-SHA256', signedData, privateKey).toString('base64');
}

describe('verifyGameCenterSignature', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const basePayload: Omit<GameCenterVerificationPayload, 'signature'> = {
    playerId: 'G:1234567890',
    bundleId: 'es.core.racing',
    timestamp: 1_755_000_000_000,
    salt: Buffer.from('some-salt-bytes').toString('base64'),
    publicKeyUrl: 'https://static.gc.apple.com/public-key/gc-prod-4.cer',
  };

  it('verifica una firma válida', () => {
    const signature = signPayload(basePayload, privateKey);
    const payload: GameCenterVerificationPayload = { ...basePayload, signature };

    expect(verifyGameCenterSignature(payload, publicKey)).toBe(true);
  });

  it('rechaza si el bundleId no coincide con lo firmado', () => {
    const signature = signPayload(basePayload, privateKey);
    const payload: GameCenterVerificationPayload = {
      ...basePayload,
      bundleId: 'com.attacker.app',
      signature,
    };

    expect(verifyGameCenterSignature(payload, publicKey)).toBe(false);
  });

  it('rechaza si el salt no coincide con lo firmado', () => {
    const signature = signPayload(basePayload, privateKey);
    const payload: GameCenterVerificationPayload = {
      ...basePayload,
      salt: Buffer.from('otro-salt').toString('base64'),
      signature,
    };

    expect(verifyGameCenterSignature(payload, publicKey)).toBe(false);
  });

  it('rechaza una firma con otra clave privada', () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const signature = signPayload(basePayload, other.privateKey);
    const payload: GameCenterVerificationPayload = { ...basePayload, signature };

    expect(verifyGameCenterSignature(payload, publicKey)).toBe(false);
  });

  it('rechaza una firma que no es base64 válido sin lanzar', () => {
    const payload: GameCenterVerificationPayload = {
      ...basePayload,
      signature: '¡esto no es base64!',
    };

    expect(verifyGameCenterSignature(payload, publicKey)).toBe(false);
  });
});

describe('isAppleGameCenterHost', () => {
  it('acepta subdominios de apple.com', () => {
    expect(
      isAppleGameCenterHost(
        'https://static.gc.apple.com/public-key/gc-prod-4.cer',
      ),
    ).toBe(true);
  });

  it('acepta apple.com exacto', () => {
    expect(isAppleGameCenterHost('https://apple.com/cert.cer')).toBe(true);
  });

  it('rechaza un host que solo contiene apple.com como substring', () => {
    expect(isAppleGameCenterHost('https://apple.com.attacker.io/cert')).toBe(
      false,
    );
  });

  it('rechaza un host completamente distinto', () => {
    expect(isAppleGameCenterHost('https://attacker.io/cert')).toBe(false);
  });

  it('rechaza una URL malformada sin lanzar', () => {
    expect(isAppleGameCenterHost('no-es-una-url')).toBe(false);
  });
});
