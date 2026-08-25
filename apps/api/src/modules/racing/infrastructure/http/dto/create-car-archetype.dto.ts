import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateCarArchetypeDto {
  @ApiProperty({
    example: 'normal',
    description: 'Único. No editable después.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'code solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  code!: string;

  @ApiProperty({ example: 'Normal' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  speedScale!: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  grip!: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  offroadGripModifier!: number;

  @ApiPropertyOptional({
    default: true,
    description:
      'Si es true, todos los jugadores lo tienen desbloqueado sin comprarlo (TASK-320).',
  })
  @IsOptional()
  @IsBoolean()
  isUnlockedByDefault?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio en la tienda. Ausente/null = no está a la venta.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceCoins?: number | null;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
