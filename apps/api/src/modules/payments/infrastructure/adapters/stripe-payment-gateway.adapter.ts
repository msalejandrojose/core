import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  type CheckoutSession,
  type CreateCheckoutSessionInput,
  type PaymentGatewayEvent,
  type PaymentGatewayPort,
} from '../../application/ports/payment-gateway.port';

@Injectable()
export class StripePaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger('payments.stripe');
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string | undefined,
  ) {
    this.stripe = new Stripe(secretKey);
    if (!webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET no definida — la firma del webhook NO se verifica.',
      );
    }
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: input.currency,
            unit_amount: Math.round(input.amount * 100),
            product_data: { name: 'Reserva Plazza' },
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    });
    if (!session.url) {
      throw new Error('Stripe no devolvió una URL de checkout.');
    }
    return { sessionId: session.id, url: session.url };
  }

  parseWebhookEvent(
    rawBody: Buffer,
    signature: string | undefined,
  ): PaymentGatewayEvent | null {
    let event: Stripe.Event;
    if (this.webhookSecret) {
      if (!signature) throw new Error('Falta la cabecera Stripe-Signature.');
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } else {
      // Sin secreto configurado, la firma no se verifica (solo dev/CI) —
      // mismo criterio que WHATSAPP_APP_SECRET/SENDGRID_WEBHOOK_PUBLIC_KEY.
      event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
    }

    // Solo nos interesan los dos eventos sobre el propio Checkout Session
    // (mismo shape de objeto en ambos, con el `metadata.reservationId` que
    // pusimos al crearlo) — cubre el éxito y la expiración sin pago.
    // `payment_intent.payment_failed` se ignora deliberadamente: durante un
    // Checkout hospedado, un intento fallido normalmente deja la sesión
    // abierta para reintentar, así que no es (todavía) un fallo definitivo.
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.expired'
    ) {
      const session = event.data.object;
      return {
        type:
          event.type === 'checkout.session.completed'
            ? 'checkout.completed'
            : 'checkout.failed',
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        metadata: session.metadata ?? {},
      };
    }
    return null;
  }
}
