import { ApiProperty } from '@nestjs/swagger';
import { Season } from '../../../domain/entities/season.entity';

export class SeasonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Temporada 1' }) name!: string;
  @ApiProperty() startsAt!: Date;
  @ApiProperty({
    nullable: true,
    description: 'Null = temporada abierta (la actual).',
  })
  endsAt!: Date | null;

  static fromDomain(season: Season): SeasonResponseDto {
    const dto = new SeasonResponseDto();
    dto.id = season.id;
    dto.name = season.name;
    dto.startsAt = season.startsAt;
    dto.endsAt = season.endsAt;
    return dto;
  }
}
