import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { HandlePaymentWebhookUseCase } from '../../application/use-cases/handle-payment-webhook.use-case';

const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

// Webhook público de Stripe (checkout de reservas, TASK-153). Excluido de
// Swagger (lo consume Stripe, no el frontend). La firma se verifica sobre el
// raw body (`req.rawBody`, habilitado globalmente en `main.ts`) dentro del
// gateway — mismo criterio que los webhooks de WhatsApp/SendGrid: firma
// inválida → 401.
@Public()
@ApiExcludeController()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly handleWebhook: HandlePaymentWebhookUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers(STRIPE_SIGNATURE_HEADER) signature?: string,
  ): Promise<{ handled: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Falta el raw body de la petición.');
    }
    try {
      return await this.handleWebhook.execute(rawBody, signature);
    } catch (err) {
      throw new UnauthorizedException(
        `Firma del webhook inválida: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
