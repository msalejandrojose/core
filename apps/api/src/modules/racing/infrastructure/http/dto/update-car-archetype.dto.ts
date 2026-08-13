import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

// Sin `code`: no es editable una vez creado (ver CreateCarArchetypeDto).
export class UpdateCarArchetypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  speedScale?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  grip?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offroadGripModifier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
