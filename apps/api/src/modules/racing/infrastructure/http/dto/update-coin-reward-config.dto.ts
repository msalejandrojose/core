import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

// Sin `key`: es el identificador del recurso (va en la URL), no un campo
// editable — mismo criterio que `UpdateTerrainEffectDto`. A diferencia de
// terreno, aquí el único campo es obligatorio: no tiene sentido un PATCH que
// no toque el importe.
export class UpdateCoinRewardConfigDto {
  @ApiProperty({ example: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  amount!: number;
}
