export interface CreateCheckoutSessionInput {
  /** Importe en la unidad "normal" (euros), no en céntimos — el adapter convierte. */
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  /** Se devuelve tal cual en el evento del webhook — úsalo para correlacionar (p.ej. `reservationId`). */
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export type PaymentGatewayEventType = 'checkout.completed' | 'checkout.failed';

export interface PaymentGatewayEvent {
  type: PaymentGatewayEventType;
  sessionId: string;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
}

export const PAYMENT_GATEWAY_PORT = 'PAYMENT_GATEWAY_PORT';

export interface PaymentGatewayPort {
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession>;
  /**
   * Verifica la firma del webhook contra el raw body y devuelve el evento
   * normalizado. Lanza si la firma no es válida — el caller debe traducirlo a
   * un 401 (mismo criterio que el resto de webhooks del repo: WhatsApp,
   * SendGrid). `null` si el tipo de evento no es uno de los que nos interesan
   * (se ignora sin error).
   */
  parseWebhookEvent(
    rawBody: Buffer,
    signature: string | undefined,
  ): PaymentGatewayEvent | null;
}
