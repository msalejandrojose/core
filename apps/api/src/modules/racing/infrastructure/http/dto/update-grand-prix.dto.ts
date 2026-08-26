import { ApiPropertyOptional } from '@nestjs/swagger';
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
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { GrandPrixDifficulty } from '../../../domain/entities/grand-prix.entity';
import { CreateGrandPrixStageDto } from './create-grand-prix.dto';

// Sin `slug`: no es editable una vez creado (ver CreateGrandPrixDto).
export class UpdateGrandPrixDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Si viene, sustituye la lista de circuitos entera, en el nuevo orden. Mínimo dos. Alternativa a `stages` (con laps=1 en cada manga).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  trackIds?: string[];

  @ApiPropertyOptional({
    type: [CreateGrandPrixStageDto],
    description:
      'Si viene, sustituye la lista de mangas entera, con vueltas por manga. Alternativa a `trackIds`.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateGrandPrixStageDto)
  stages?: CreateGrandPrixStageDto[];

  @ApiPropertyOptional({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: GrandPrixDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  creditsReward?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: '`null` limpia la imagen; omitir la deja tal cual.',
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  imageId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
