import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from '@core/shared-types';

export class CreateSendingAccountTypeDto {
  @ApiProperty({ example: 'email' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  key: string;

  @ApiProperty({ example: 'Email' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: NOTIFICATION_CHANNELS })
  @IsIn(NOTIFICATION_CHANNELS)
  channel: NotificationChannel;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
