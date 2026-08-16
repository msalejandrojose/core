import { ApiPropertyOptional } from '@nestjs/swagger';
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
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TrackTheme } from '../../../domain/entities/track.entity';
import { TrackCellDto } from './track-cell.dto';

// Sin `slug`: no es editable (ver comentario en AdminUpdateTrackUseCase).
// `isActive` vive aquí también: activar/desactivar es un PATCH más, no un
// endpoint aparte (TASK-242, criterio de done).
export class UpdateTrackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  sectorCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minPlausibleMs?: number;

  @ApiPropertyOptional({ type: [TrackCellDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ValidateNested({ each: true })
  @Type(() => TrackCellDto)
  path?: TrackCellDto[];

  @ApiPropertyOptional({ enum: TrackTheme })
  @IsOptional()
  @IsEnum(TrackTheme)
  theme?: TrackTheme;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  grip?: number;

  @ApiPropertyOptional({
    description: 'Activar/desactivar el circuito sin perder su histórico.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'Id de un fichero ya subido (módulo storage) para la miniatura del circuito. `null` la quita.',
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  imageId?: string | null;
}
