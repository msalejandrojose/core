import { createPublicKey, createVerify, type KeyObject } from 'node:crypto';
import { Logger } from '@nestjs/common';

export const SENDGRID_SIGNATURE_VERIFIER = Symbol(
  'NOTIFICATIONS_SENDGRID_SIGNATURE_VERIFIER',
);

export const SENDGRID_SIGNATURE_HEADER =
  'x-twilio-email-event-webhook-signature';
export const SENDGRID_TIMESTAMP_HEADER =
  'x-twilio-email-event-webhook-timestamp';

// Verifica la firma del Event Webhook de SendGrid. SendGrid firma con ECDSA
// (prime256v1) el payload `timestamp + cuerpo_crudo` y publica una clave pública
// (base64 DER/SPKI) en la config del webhook.
//
// Si no se configura `SENDGRID_WEBHOOK_PUBLIC_KEY`, la verificación queda
// DESACTIVADA (dev/CI): `verify` acepta todo, igual que el patrón del cipher
// nulo. En producción, definir la clave para rechazar payloads no firmados.
export class SendgridSignatureVerifier {
  private readonly key?: KeyObject;
  private readonly logger = new Logger('notifications.sendgrid.webhook');

  constructor(publicKeyBase64?: string) {
    if (publicKeyBase64) {
      this.key = createPublicKey({
        key: Buffer.from(publicKeyBase64, 'base64'),
        format: 'der',
        type: 'spki',
      });
    } else {
      this.logger.warn(
        'SENDGRID_WEBHOOK_PUBLIC_KEY no definida — la firma del webhook NO se verifica.',
      );
    }
  }

  get enabled(): boolean {
    return this.key !== undefined;
  }

  verify(rawBody: string, signature?: string, timestamp?: string): boolean {
    if (!this.key) return true; // verificación desactivada
    if (!signature || !timestamp) return false;
    try {
      const verifier = createVerify('sha256');
      verifier.update(timestamp + rawBody);
      verifier.end();
      return verifier.verify(
        { key: this.key, dsaEncoding: 'der' },
        Buffer.from(signature, 'base64'),
      );
    } catch {
      return false;
    }
  }
}
