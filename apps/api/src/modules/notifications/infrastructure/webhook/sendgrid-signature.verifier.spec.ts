import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { SendgridSignatureVerifier } from './sendgrid-signature.verifier';

function sign(privateKey: KeyObject, payload: string): string {
  const signer = createSign('sha256');
  signer.update(payload);
  signer.end();
  return signer
    .sign({ key: privateKey, dsaEncoding: 'der' })
    .toString('base64');
}

describe('SendgridSignatureVerifier', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const publicKeyBase64 = publicKey
    .export({ format: 'der', type: 'spki' })
    .toString('base64');

  it('sin clave configurada, la verificación queda desactivada (acepta todo)', () => {
    const verifier = new SendgridSignatureVerifier();
    expect(verifier.enabled).toBe(false);
    expect(verifier.verify('cualquier cosa')).toBe(true);
  });

  it('acepta una firma válida', () => {
    const verifier = new SendgridSignatureVerifier(publicKeyBase64);
    const timestamp = '1700000000';
    const body = '[{"event":"delivered"}]';
    const signature = sign(privateKey, timestamp + body);
    expect(verifier.enabled).toBe(true);
    expect(verifier.verify(body, signature, timestamp)).toBe(true);
  });

  it('rechaza una firma con cuerpo manipulado', () => {
    const verifier = new SendgridSignatureVerifier(publicKeyBase64);
    const timestamp = '1700000000';
    const signature = sign(privateKey, timestamp + '[{"event":"delivered"}]');
    expect(verifier.verify('[{"event":"bounce"}]', signature, timestamp)).toBe(
      false,
    );
  });

  it('rechaza si faltan la firma o el timestamp', () => {
    const verifier = new SendgridSignatureVerifier(publicKeyBase64);
    expect(verifier.verify('body', undefined, '1700000000')).toBe(false);
    expect(verifier.verify('body', 'sig', undefined)).toBe(false);
  });
});
