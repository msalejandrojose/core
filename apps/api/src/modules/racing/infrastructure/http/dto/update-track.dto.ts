import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

// Sin `slug` (no editable) ni geometría (`path`/`theme`/`grip`/`imageId`,
// TASK-336): eso vive en el circuito, se edita vía `UpdateCircuitDto`.
// `isActive` sigue aquí: activar/desactivar ESTA variante es un PATCH más,
// no un endpoint aparte (TASK-242, criterio de done).
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

  @ApiPropertyOptional({
    description: 'Activar/desactivar esta variante sin perder su histórico.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
