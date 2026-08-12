import { ApiProperty } from '@nestjs/swagger';
import { Track } from '../../../domain/entities/track.entity';

export class TrackResponseDto {
  @ApiProperty({ example: 'kenney-01' })
  slug!: string;

  @ApiProperty({ example: 'Kenney' })
  name!: string;

  @ApiProperty({
    example: 4,
    description:
      'Sectores de la vuelta: checkpoints intermedios más la meta. Es la longitud que debe tener splitsMs al subir un tiempo.',
  })
  sectorCount!: number;

  static fromTrack(track: Track): TrackResponseDto {
    return {
      slug: track.slug,
      name: track.name,
      sectorCount: track.sectorCount,
    };
  }
}
