import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { TerrainType } from '../../../domain/track-terrain';

// Una celda del `path`. Las reglas de trazado en sí (bucle cerrado, sin
// repetir celda, meta en recta...) NO se validan aquí — eso lo hace
// `validateTrackPath` en el dominio contra el array completo, no celda a
// celda (TASK-242, criterio de done: no duplicar la validación).
export class TrackCellDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  x!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  y!: number;

  @ApiPropertyOptional({
    enum: TerrainType,
    description: 'Ausente = asfalto.',
  })
  @IsOptional()
  @IsEnum(TerrainType)
  terrain?: TerrainType;
}
