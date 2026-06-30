import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFormDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Schema JSON declarativo de campos (versión + fields[])' })
  @IsObject()
  schema: Record<string, unknown>;
}
