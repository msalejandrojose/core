import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSendingAccountDto {
  @ApiProperty({ description: 'ID del tipo de cuenta de envío.' })
  @IsUUID()
  typeId: string;

  @ApiProperty({ example: 'Resend — producción' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Config de la cuenta según el canal del tipo (se valida server-side). Ej. email: { provider, fromEmail, fromName, apiKey }.',
  })
  @IsObject()
  config: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Cuenta por defecto del canal.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
