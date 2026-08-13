import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { TrackTheme } from '../../../domain/entities/track.entity';
import { TrackCellDto } from './track-cell.dto';

export class CreateTrackDto {
  @ApiProperty({
    example: 'circuito-del-puerto',
    description: 'Único. No editable una vez creado.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  slug!: string;

  @ApiProperty({ example: 'Circuito del Puerto' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 4,
    description: 'Checkpoints intermedios + la meta.',
  })
  @IsInt()
  @Min(1)
  sectorCount!: number;

  @ApiProperty({
    example: 9200,
    description: 'Suelo de plausibilidad de una vuelta, en ms.',
  })
  @IsInt()
  @Min(1)
  minPlausibleMs!: number;

  @ApiProperty({
    type: [TrackCellDto],
    description:
      'Celdas del trazado en orden de recorrido. Se valida contra las reglas del dominio (bucle cerrado, pasos ortogonales de una celda, sin repetir celda, meta en recta).',
  })
  @IsArray()
  @ArrayMinSize(4)
  @ValidateNested({ each: true })
  @Type(() => TrackCellDto)
  path!: TrackCellDto[];

  @ApiProperty({ enum: TrackTheme, example: TrackTheme.MEADOW })
  @IsEnum(TrackTheme)
  theme!: TrackTheme;

  @ApiProperty({ example: 1.0, description: '1.0 = asfalto seco.' })
  @IsPositive()
  grip!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
