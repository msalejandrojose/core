import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { type AsyncValidationResult } from '../../../application/ports/async-validator.port';

export class AsyncValidateDto {
  @ApiProperty({
    description: 'Valor del campo a validar.',
    type: Object,
    nullable: true,
  })
  value: unknown;

  @ApiPropertyOptional({
    description: 'Contexto adicional (p. ej. { excludeId }).',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class AsyncValidateResultDto {
  @ApiProperty()
  valid: boolean;

  @ApiPropertyOptional({ description: 'Mensaje cuando valid === false.' })
  message?: string;

  static from(result: AsyncValidationResult): AsyncValidateResultDto {
    const dto = new AsyncValidateResultDto();
    dto.valid = result.valid;
    dto.message = result.message;
    return dto;
  }
}
