import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DeliveryEvent } from '../../../domain/entities/notification-delivery.entity';

export class DeliveryEventDto {
  @ApiProperty() type: string;
  @ApiProperty() at: string;
  @ApiPropertyOptional() reason?: string;

  static fromDomain(e: DeliveryEvent): DeliveryEventDto {
    const dto = new DeliveryEventDto();
    dto.type = e.type;
    dto.at = e.at;
    dto.reason = e.reason;
    return dto;
  }
}
