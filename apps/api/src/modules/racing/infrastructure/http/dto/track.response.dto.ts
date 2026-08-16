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

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'URL de visualización pública de la miniatura, ya lista para <img src>. null si el circuito no tiene una.',
  })
  imageUrl!: string | null;

  // `imageUrl` se resuelve fuera (el controller, con `FileViewTokenService`):
  // el dominio guarda solo el id del fichero, no sabe construir URLs.
  static fromTrack(
    track: Track,
    imageUrl: string | null = null,
  ): TrackResponseDto {
    return {
      slug: track.slug,
      name: track.name,
      sectorCount: track.sectorCount,
      imageUrl,
    };
  }
}
