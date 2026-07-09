import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { type DevicePlatform } from '../../../domain/entities/device.entity';

const PLATFORMS: DevicePlatform[] = ['ios', 'android', 'web'];

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Token de push del dispositivo (emitido por FCM).',
    maxLength: 512,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token!: string;

  @ApiProperty({
    enum: PLATFORMS,
    description: 'Plataforma del dispositivo (Capacitor.getPlatform()).',
    example: 'ios',
  })
  @IsIn(PLATFORMS)
  platform!: DevicePlatform;
}
