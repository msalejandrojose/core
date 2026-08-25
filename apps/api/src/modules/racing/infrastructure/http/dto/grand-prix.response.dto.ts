import { ApiProperty } from '@nestjs/swagger';
import { GrandPrix } from '../../../domain/entities/grand-prix.entity';

export class GrandPrixStageDto {
  @ApiProperty() trackId!: string;
  @ApiProperty({ example: 'kenney-01' }) trackSlug!: string;
  @ApiProperty({ example: 'Kenney' }) trackName!: string;
  @ApiProperty({ example: 0 }) order!: number;
}

export class GrandPrixResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'copa-verano' }) slug!: string;
  @ApiProperty({ example: 'Copa de Verano' }) name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [GrandPrixStageDto] }) stages!: GrandPrixStageDto[];

  static fromDomain(grandPrix: GrandPrix): GrandPrixResponseDto {
    const dto = new GrandPrixResponseDto();
    dto.id = grandPrix.id;
    dto.slug = grandPrix.slug;
    dto.name = grandPrix.name;
    dto.isActive = grandPrix.isActive;
    dto.stages = grandPrix.stages.map((s) => ({
      trackId: s.trackId,
      trackSlug: s.trackSlug,
      trackName: s.trackName,
      order: s.order,
    }));
    return dto;
  }
}
