import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  type CheckoutSession,
  type CreateCheckoutSessionInput,
  type PaymentGatewayEvent,
  type PaymentGatewayPort,
} from '../../application/ports/payment-gateway.port';

/**
 * Adapter nulo para tests / CI / dev sin `STRIPE_SECRET_KEY`. No hace ninguna
 * llamada de red: genera un id de sesión falso y una URL de vuelta directa a
 * `successUrl` (el checkout "se completa" al instante, sin cobro real). Se
 * puede sustituir vía DI sin cambiar el código del dominio.
 */
@Injectable()
export class NullPaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger('payments.null-gateway');

  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession> {
    const sessionId = `null_cs_${randomUUID()}`;
    this.logger.log(
      `[NullPaymentGateway] Checkout simulado ${sessionId} por ${input.amount} ${input.currency}.`,
    );
    return Promise.resolve({ sessionId, url: input.successUrl });
  }

  parseWebhookEvent(): PaymentGatewayEvent | null {
    this.logger.warn(
      '[NullPaymentGateway] No hay proveedor real configurado — no se pueden recibir webhooks.',
    );
    return null;
  }
}
