import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TargetInputDto {
  @ApiProperty({ maxLength: 120, example: 'users' })
  @IsString()
  @MaxLength(120)
  type: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { isActive: true },
  })
  @IsOptional()
  @IsObject()
  filter?: Record<string, unknown>;
}

// Disparo inmediato sobre un target (fan-out). `target` es obligatorio aquí; el
// disparo sin target es el endpoint `:key/run`.
export class DispatchWorkflowDto {
  @ApiProperty({ type: TargetInputDto })
  @ValidateNested()
  @Type(() => TargetInputDto)
  target: TargetInputDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
