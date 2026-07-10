import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { IngestSendgridEventsUseCase } from '../../application/use-cases/ingest-sendgrid-events.use-case';
import { RecordWebhookEventUseCase } from '../../application/use-cases/record-webhook-event.use-case';
import type { SendgridEvent } from '../../domain/delivery/sendgrid-event';
import {
  SENDGRID_SIGNATURE_HEADER,
  SENDGRID_SIGNATURE_VERIFIER,
  SENDGRID_TIMESTAMP_HEADER,
  SendgridSignatureVerifier,
} from '../webhook/sendgrid-signature.verifier';

const SOURCE = 'sendgrid';

// Endpoint público que recibe el Event Webhook de SendGrid (delivered, bounce,
// open, click, spamreport…) y actualiza el estado de las deliveries. Se excluye
// de Swagger: no lo consume el frontend, lo llama SendGrid. Cada llamada queda
// registrada como `WebhookEvent` (payload crudo) independientemente de si la
// firma es válida o el procesamiento falla, para poder inspeccionarla y
// reprocesarla desde el backoffice.
@Public()
@ApiExcludeController()
@Controller('webhooks/sendgrid')
export class SendgridWebhookController {
  constructor(
    private readonly ingest: IngestSendgridEventsUseCase,
    private readonly recordWebhookEvent: RecordWebhookEventUseCase,
    @Inject(SENDGRID_SIGNATURE_VERIFIER)
    private readonly verifier: SendgridSignatureVerifier,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
    @Headers(SENDGRID_SIGNATURE_HEADER) signature?: string,
    @Headers(SENDGRID_TIMESTAMP_HEADER) timestamp?: string,
  ): Promise<{ received: number; applied: number; unmatched: number }> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const signatureValid = this.verifier.verify(rawBody, signature, timestamp);

    const events: SendgridEvent[] = Array.isArray(body)
      ? (body.filter(
          (e) => typeof e === 'object' && e !== null,
        ) as SendgridEvent[])
      : [];

    const webhookEvent = await this.recordWebhookEvent.receive({
      source: SOURCE,
      type: events[0]?.event ?? null,
      payload: body,
      signatureValid,
    });

    if (!signatureValid) {
      await this.recordWebhookEvent.markFailed(
        webhookEvent.id,
        'Firma del webhook inválida.',
      );
      throw new UnauthorizedException('Firma del webhook inválida.');
    }

    try {
      const result = await this.ingest.execute(events);
      await this.recordWebhookEvent.markProcessed(
        webhookEvent.id,
        `applied=${result.applied} unmatched=${result.unmatched}`,
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      await this.recordWebhookEvent.markFailed(webhookEvent.id, message);
      throw err;
    }
  }
}
