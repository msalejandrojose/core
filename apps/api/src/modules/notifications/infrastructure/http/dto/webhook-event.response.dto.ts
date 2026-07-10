import { ApiProperty } from '@nestjs/swagger';
import type {
  WebhookEvent,
  WebhookEventStatus,
} from '../../../domain/entities/webhook-event.entity';

export class WebhookEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() source: string;
  @ApiProperty({ type: String, nullable: true }) type: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true })
  payload: unknown;
  @ApiProperty() signatureValid: boolean;
  @ApiProperty({ enum: ['pending', 'processed', 'failed'] })
  status: WebhookEventStatus;
  @ApiProperty({ type: String, nullable: true }) result: string | null;
  @ApiProperty({ type: String, nullable: true }) error: string | null;
  @ApiProperty({ type: Date, nullable: true }) processedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(e: WebhookEvent): WebhookEventResponseDto {
    const dto = new WebhookEventResponseDto();
    dto.id = e.id;
    dto.source = e.source;
    dto.type = e.type;
    dto.payload = e.payload;
    dto.signatureValid = e.signatureValid;
    dto.status = e.status;
    dto.result = e.result;
    dto.error = e.error;
    dto.processedAt = e.processedAt;
    dto.createdAt = e.createdAt;
    dto.updatedAt = e.updatedAt;
    return dto;
  }
}
