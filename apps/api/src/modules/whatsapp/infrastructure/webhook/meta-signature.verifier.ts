import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const META_SIGNATURE_HEADER = 'x-hub-signature-256';

// Verifica la firma del webhook de la WhatsApp Cloud API. Meta firma el cuerpo
// crudo con el App Secret (HMAC-SHA256) y lo envía en `X-Hub-Signature-256:
// sha256=<hex>`. Sin `WHATSAPP_APP_SECRET` configurado la verificación se
// desactiva (dev/CI), igual que hace el verificador de SendGrid.
@Injectable()
export class MetaSignatureVerifier {
  private readonly logger = new Logger('whatsapp.webhook.signature');
  private readonly appSecret?: string;

  constructor(config: ConfigService) {
    this.appSecret = config.get<string>('WHATSAPP_APP_SECRET') || undefined;
    if (!this.appSecret) {
      this.logger.warn(
        'WHATSAPP_APP_SECRET no definido — la firma del webhook NO se verifica (dev/CI).',
      );
    }
  }

  verify(rawBody: string, signatureHeader?: string): boolean {
    if (!this.appSecret) return true; // verificación desactivada
    if (!signatureHeader?.startsWith('sha256=')) return false;

    const provided = signatureHeader.slice('sha256='.length);
    const expected = createHmac('sha256', this.appSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const a = Buffer.from(provided, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
