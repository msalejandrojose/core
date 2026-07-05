import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from '@core/shared-types';
import type { SendNotificationResult } from '../../../application/use-cases/send-notification.use-case';

export class SendResultResponseDto {
  @ApiProperty() sent: boolean;
  @ApiProperty() dryRun: boolean;
  @ApiProperty() skipped: boolean;
  @ApiPropertyOptional() reason?: string;
  @ApiProperty({ enum: NOTIFICATION_CHANNELS }) channel: NotificationChannel;
  @ApiProperty() to: string;
  @ApiProperty() messageTypeKey: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Contenido renderizado con las variables.',
  })
  rendered: Record<string, unknown>;

  static fromResult(result: SendNotificationResult): SendResultResponseDto {
    const dto = new SendResultResponseDto();
    dto.sent = result.sent;
    dto.dryRun = result.dryRun;
    dto.skipped = result.skipped;
    dto.reason = result.reason;
    dto.channel = result.channel;
    dto.to = result.to;
    dto.messageTypeKey = result.messageTypeKey;
    dto.rendered = result.rendered;
    return dto;
  }
}
