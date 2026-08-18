import { ApiProperty } from '@nestjs/swagger';
import { PlayerCarLoadoutResult } from '../../../application/use-cases/get-player-car-loadout.use-case';
import { CarArchetypeResponseDto } from './car-archetype.response.dto';
import { CarPartResponseDto } from './car-part.response.dto';
import { CarSkinResponseDto } from './car-skin.response.dto';

export class CarStatsDto {
  @ApiProperty() speedScale!: number;
  @ApiProperty() grip!: number;
}

export class PlayerCarLoadoutResponseDto {
  @ApiProperty({ type: CarArchetypeResponseDto })
  archetype!: CarArchetypeResponseDto;
  @ApiProperty({ type: CarPartResponseDto, nullable: true })
  tiresPart!: CarPartResponseDto | null;
  @ApiProperty({ type: CarPartResponseDto, nullable: true })
  wingPart!: CarPartResponseDto | null;
  @ApiProperty({ type: CarPartResponseDto, nullable: true })
  chassisPart!: CarPartResponseDto | null;
  @ApiProperty({
    type: CarSkinResponseDto,
    nullable: true,
    description: 'Null = usa el modelo por defecto del arquetipo.',
  })
  skin!: CarSkinResponseDto | null;
  @ApiProperty({
    type: CarStatsDto,
    description: 'Arquetipo + piezas ya combinados (ver computeCarStats).',
  })
  stats!: CarStatsDto;

  static fromDomain(
    result: PlayerCarLoadoutResult,
  ): PlayerCarLoadoutResponseDto {
    const dto = new PlayerCarLoadoutResponseDto();
    dto.archetype = CarArchetypeResponseDto.fromDomain(result.archetype);
    dto.tiresPart = result.tiresPart
      ? CarPartResponseDto.fromDomain(result.tiresPart)
      : null;
    dto.wingPart = result.wingPart
      ? CarPartResponseDto.fromDomain(result.wingPart)
      : null;
    dto.chassisPart = result.chassisPart
      ? CarPartResponseDto.fromDomain(result.chassisPart)
      : null;
    dto.skin = result.skin ? CarSkinResponseDto.fromDomain(result.skin) : null;
    dto.stats = result.stats;
    return dto;
  }
}
