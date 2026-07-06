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
import type { SendgridEvent } from '../../domain/delivery/sendgrid-event';
import {
  SENDGRID_SIGNATURE_HEADER,
  SENDGRID_SIGNATURE_VERIFIER,
  SENDGRID_TIMESTAMP_HEADER,
  SendgridSignatureVerifier,
} from '../webhook/sendgrid-signature.verifier';

// Endpoint público que recibe el Event Webhook de SendGrid (delivered, bounce,
// open, click, spamreport…) y actualiza el estado de las deliveries. Se excluye
// de Swagger: no lo consume el frontend, lo llama SendGrid.
@Public()
@ApiExcludeController()
@Controller('webhooks/sendgrid')
export class SendgridWebhookController {
  constructor(
    private readonly ingest: IngestSendgridEventsUseCase,
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
    if (!this.verifier.verify(rawBody, signature, timestamp)) {
      throw new UnauthorizedException('Firma del webhook inválida.');
    }

    const events: SendgridEvent[] = Array.isArray(body)
      ? (body.filter(
          (e) => typeof e === 'object' && e !== null,
        ) as SendgridEvent[])
      : [];

    return this.ingest.execute(events);
  }
}
