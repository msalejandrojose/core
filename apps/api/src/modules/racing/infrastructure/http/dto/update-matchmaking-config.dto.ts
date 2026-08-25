import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

// Sin `key`: es el identificador del recurso (va en la URL), no un campo
// editable — mismo criterio que `UpdateCoinRewardConfigDto`.
export class UpdateMatchmakingConfigDto {
  @ApiProperty({ example: 32, minimum: 0 })
  @IsInt()
  @Min(0)
  value!: number;
}
