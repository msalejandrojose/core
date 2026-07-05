import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class PreviewMessageTypeDto {
  @ApiPropertyOptional({
    description: 'Destinatario de prueba (para render de {{ to }}).',
    default: 'preview@example.com',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Variables de ejemplo para renderizar las plantillas.',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
