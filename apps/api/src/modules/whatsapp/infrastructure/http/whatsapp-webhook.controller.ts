import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { IngestInboundWebhookUseCase } from '../../application/use-cases/ingest-inbound-webhook.use-case';
import {
  META_SIGNATURE_HEADER,
  MetaSignatureVerifier,
} from '../webhook/meta-signature.verifier';

// Webhook público de la WhatsApp Cloud API de Meta. Excluido de Swagger (lo
// consume Meta, no el frontend). Dos rutas:
//   - GET  → verificación del webhook (handshake hub.challenge).
//   - POST → recepción de mensajes entrantes y estados de entrega.
@Public()
@ApiExcludeController()
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly verifier: MetaSignatureVerifier,
    private readonly ingest: IngestInboundWebhookUseCase,
  ) {}

  // Meta llama a esta ruta al configurar el webhook: si el verify_token coincide
  // con el nuestro, debemos devolver el `hub.challenge` tal cual.
  @Get()
  verify(@Query() query: Record<string, string>): string {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const expected = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && token === expected) {
      return challenge ?? '';
    }
    throw new ForbiddenException('Verificación del webhook fallida.');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
    @Headers(META_SIGNATURE_HEADER) signature?: string,
  ): Promise<{ messages: number; statuses: number; skipped: number }> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    if (!this.verifier.verify(rawBody, signature)) {
      throw new UnauthorizedException('Firma del webhook inválida.');
    }
    return this.ingest.execute(body);
  }
}
