import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCarSkinDto {
  @ApiProperty({
    example: 'purple',
    description: 'Único. No editable después.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'code solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  code!: string;

  @ApiProperty({ example: 'Púrpura' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'res://models/vehicle-truck-purple.glb',
    description: 'Ruta del recurso en el cliente Godot.',
  })
  @IsString()
  @MaxLength(255)
  modelPath!: string;

  @ApiPropertyOptional({
    default: true,
    description:
      'Si es true, todos los jugadores lo tienen disponible sin desbloqueo explícito.',
  })
  @IsOptional()
  @IsBoolean()
  isUnlockedByDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
