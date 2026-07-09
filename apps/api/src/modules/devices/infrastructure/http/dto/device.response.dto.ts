import { ApiProperty } from '@nestjs/swagger';
import {
  type Device,
  type DevicePlatform,
} from '../../../domain/entities/device.entity';

export class DeviceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({
    enum: ['ios', 'android', 'web'],
    description: 'Plataforma del dispositivo.',
  })
  platform: DevicePlatform;
  @ApiProperty({
    description: 'Últimos 6 caracteres del token (el token completo no se expone).',
    example: '…a1b2c3',
  })
  tokenPreview: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() lastSeenAt: Date;

  static fromDomain(d: Device): DeviceResponseDto {
    const dto = new DeviceResponseDto();
    dto.id = d.id;
    dto.platform = d.platform;
    dto.tokenPreview = `…${d.token.slice(-6)}`;
    dto.createdAt = d.createdAt;
    dto.lastSeenAt = d.lastSeenAt;
    return dto;
  }
}
