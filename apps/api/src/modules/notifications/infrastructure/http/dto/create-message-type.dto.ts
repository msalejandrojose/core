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

export class CreateMessageTypeDto {
  @ApiProperty({ example: 'welcome_email' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  key: string;

  @ApiProperty({ example: 'Email de bienvenida' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @ApiProperty({ description: 'Cuenta de envío; determina el canal.' })
  @IsUUID()
  accountId: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Contenido según el canal (se valida server-side). Admite plantillas {{ var }}. Ej. email: { subject, html, text }.',
  })
  @IsObject()
  content: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
