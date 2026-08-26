import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { GrandPrixDifficulty } from '../../../domain/entities/grand-prix.entity';

// Un stage con `trackId` y sus propias vueltas. Se mantiene un endpoint
// alternativo `trackIds` (array plano) para no romper llamadas existentes:
// si viene `trackIds`, cada manga tiene `laps = 1` por defecto.
export class CreateGrandPrixStageDto {
  @ApiProperty() @IsUUID() trackId!: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  laps?: number;
}

export class CreateGrandPrixDto {
  @ApiProperty({
    example: 'copa-verano',
    description: 'Único. No editable después.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  slug!: string;

  @ApiProperty({ example: 'Copa de Verano' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Ids de circuito, en el orden en que se disputan. Mínimo dos. Alternativa a `stages` (cuando se usa, todas las mangas quedan con laps=1).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  trackIds?: string[];

  @ApiPropertyOptional({
    type: [CreateGrandPrixStageDto],
    description: 'Mangas con vueltas por manga. Alternativa a `trackIds`.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateGrandPrixStageDto)
  stages?: CreateGrandPrixStageDto[];

  @ApiPropertyOptional({ enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: GrandPrixDifficulty;

  @ApiPropertyOptional({ example: 2500, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditsReward?: number;

  @ApiPropertyOptional({ example: 200, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'Id de un fichero ya subido (módulo storage) para la portada del GP.',
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  imageId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
