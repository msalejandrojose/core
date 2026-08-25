import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

// Sin `type`: es el identificador del recurso (va en la URL), no un campo
// editable — mismo criterio que el `code` de CarArchetype.
export class UpdateTerrainEffectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  grip?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  slowsTopSpeed?: boolean;
}
