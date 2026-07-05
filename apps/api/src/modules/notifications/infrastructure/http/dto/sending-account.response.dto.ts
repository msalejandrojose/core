import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { NotificationChannel } from '@core/shared-types';
import { maskConfigSecrets } from '../../../application/config-secrets';
import type { SendingAccount } from '../../../domain/entities/sending-account.entity';

export class SendingAccountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() typeId: string;
  @ApiPropertyOptional({ description: 'Canal derivado del tipo.' })
  channel?: NotificationChannel;
  @ApiProperty() name: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Config con los secretos enmascarados.',
  })
  config: Record<string, unknown>;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(account: SendingAccount): SendingAccountResponseDto {
    const dto = new SendingAccountResponseDto();
    dto.id = account.id;
    dto.typeId = account.typeId;
    dto.channel = account.type?.channel;
    dto.name = account.name;
    // Nunca exponemos secretos en claro: se enmascaran con el schema del tipo.
    dto.config = account.type
      ? maskConfigSecrets(account.config, account.type.configSchema)
      : account.config;
    dto.isActive = account.isActive;
    dto.isDefault = account.isDefault;
    dto.createdAt = account.createdAt;
    dto.updatedAt = account.updatedAt;
    return dto;
  }
}
