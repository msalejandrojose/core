import { ApiProperty } from '@nestjs/swagger';
import type {
  GrandPrix,
  GrandPrixCircuitWeather,
  GrandPrixDifficulty,
} from '../../../domain/entities/grand-prix.entity';

export class GrandPrixStageDto {
  @ApiProperty() trackId!: string;
  @ApiProperty({ example: 'kenney-01' }) trackSlug!: string;
  @ApiProperty({ example: 'Kenney' }) trackName!: string;
  @ApiProperty({ example: 0 }) order!: number;
  @ApiProperty({ example: 1 }) laps!: number;
  @ApiProperty({ enum: ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY'] })
  circuitWeather!: GrandPrixCircuitWeather;
  @ApiProperty({ type: String, nullable: true })
  circuitImageUrl!: string | null;
}

export class GrandPrixResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'copa-verano' }) slug!: string;
  @ApiProperty({ example: 'Copa de Verano' }) name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  difficulty!: GrandPrixDifficulty;
  @ApiProperty({ example: 2500 }) creditsReward!: number;
  @ApiProperty({ example: 200 }) xpReward!: number;
  @ApiProperty({ type: String, nullable: true }) imageId!: string | null;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;
  @ApiProperty({ type: [GrandPrixStageDto] }) stages!: GrandPrixStageDto[];

  // Los URLs (imagen del GP y de cada circuito) las resuelve fuera el
  // controller, con `FileViewTokenService` — misma inversión que en
  // `AdminCircuitResponseDto`: la entidad no depende del módulo de storage.
  static fromDomain(
    grandPrix: GrandPrix,
    imageUrl: string | null,
    stageImageUrlByTrackId: (trackId: string) => string | null,
  ): GrandPrixResponseDto {
    const dto = new GrandPrixResponseDto();
    dto.id = grandPrix.id;
    dto.slug = grandPrix.slug;
    dto.name = grandPrix.name;
    dto.isActive = grandPrix.isActive;
    dto.difficulty = grandPrix.difficulty;
    dto.creditsReward = grandPrix.creditsReward;
    dto.xpReward = grandPrix.xpReward;
    dto.imageId = grandPrix.imageId;
    dto.imageUrl = imageUrl;
    dto.stages = grandPrix.stages.map((s) => ({
      trackId: s.trackId,
      trackSlug: s.trackSlug,
      trackName: s.trackName,
      order: s.order,
      laps: s.laps,
      circuitWeather: s.circuitWeather,
      circuitImageUrl: stageImageUrlByTrackId(s.trackId),
    }));
    return dto;
  }
}
