import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
} from '../../../payments/application/ports/payment-gateway.port';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
} from '../ports/payment-repository.port';

export interface HandlePaymentWebhookResult {
  handled: boolean;
}

/**
 * Procesa un webhook del proveedor de pago (hoy solo Stripe): verifica la
 * firma (delegado en el gateway, que lanza si no es válida — el controller
 * lo traduce a 401), y marca el `Payment` correspondiente como `PAID` o
 * `FAILED`. Idempotente: reprocesar el mismo evento no cambia un pago que ya
 * está en un estado terminal.
 *
 * Deliberadamente NO transiciona el estado de la `Reservation` — la
 * confirmación de la reserva sigue siendo una acción explícita del host
 * (`ConfirmReservationUseCase`, TASK-148/149), independiente de si ya se ha
 * cobrado. Unificar ambos flujos es una decisión de producto fuera de
 * alcance de TASK-153.
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger('parking.payments.webhook');

  constructor(
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<HandlePaymentWebhookResult> {
    const event = this.gateway.parseWebhookEvent(rawBody, signature);
    if (!event) return { handled: false };

    const payment = await this.payments.findByCheckoutSessionId(
      event.sessionId,
    );
    if (!payment) {
      this.logger.warn(
        `Webhook de pago para una sesión desconocida: ${event.sessionId}`,
      );
      return { handled: false };
    }

    // Idempotente: un pago ya en estado terminal no se reprocesa.
    if (payment.status === 'PAID' || payment.status === 'REFUNDED') {
      return { handled: true };
    }

    if (event.type === 'checkout.completed') {
      await this.payments.update(payment.id, {
        status: 'PAID',
        providerPaymentIntentId: event.paymentIntentId,
        paidAt: new Date(),
      });
    } else {
      await this.payments.update(payment.id, {
        status: 'FAILED',
        failedAt: new Date(),
      });
    }
    return { handled: true };
  }
}
