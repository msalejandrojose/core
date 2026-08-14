import { ApiProperty } from '@nestjs/swagger';
import { RacingTerrainEffect } from '../../../domain/entities/racing-terrain-effect.entity';
import { TerrainType } from '../../../domain/track-terrain';

export class TerrainEffectResponseDto {
  @ApiProperty({ enum: TerrainType }) type!: TerrainType;
  @ApiProperty({ example: 0.4 }) grip!: number;
  @ApiProperty({
    description: 'Si además de perder agarre, frena la velocidad punta.',
  })
  slowsTopSpeed!: boolean;

  static fromDomain(effect: RacingTerrainEffect): TerrainEffectResponseDto {
    const dto = new TerrainEffectResponseDto();
    dto.type = effect.type;
    dto.grip = effect.grip;
    dto.slowsTopSpeed = effect.slowsTopSpeed;
    return dto;
  }
}

export class TerrainEffectListResponseDto {
  @ApiProperty({ type: [TerrainEffectResponseDto] })
  items!: TerrainEffectResponseDto[];

  static fromDomain(
    effects: RacingTerrainEffect[],
  ): TerrainEffectListResponseDto {
    const dto = new TerrainEffectListResponseDto();
    dto.items = effects.map((e) => TerrainEffectResponseDto.fromDomain(e));
    return dto;
  }
}
