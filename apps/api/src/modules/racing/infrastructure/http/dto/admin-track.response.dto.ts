import { ApiProperty } from '@nestjs/swagger';
import { Track, TrackTheme } from '../../../domain/entities/track.entity';
import { TrackCellDto } from './track-cell.dto';

// A diferencia de TrackResponseDto (jugador, sin geometría), este expone el
// circuito completo: es el que consume el editor del backoffice.
export class AdminTrackResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'kenney-01' }) slug!: string;
  @ApiProperty({ example: 'Kenney' }) name!: string;
  @ApiProperty() sectorCount!: number;
  @ApiProperty() minPlausibleMs!: number;
  @ApiProperty({ type: [TrackCellDto] }) path!: TrackCellDto[];
  @ApiProperty({ enum: TrackTheme }) theme!: TrackTheme;
  @ApiProperty() grip!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) imageId!:
    | string
    | null;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;

  // `imageUrl` se resuelve fuera (el controller, con `FileViewTokenService`):
  // el dominio guarda solo el id del fichero, no sabe construir URLs.
  static fromTrack(
    track: Track,
    imageUrl: string | null = null,
  ): AdminTrackResponseDto {
    const dto = new AdminTrackResponseDto();
    dto.id = track.id;
    dto.slug = track.slug;
    dto.name = track.name;
    dto.sectorCount = track.sectorCount;
    dto.minPlausibleMs = track.minPlausibleMs;
    dto.path = track.path;
    dto.theme = track.theme;
    dto.grip = track.grip;
    dto.isActive = track.isActive;
    dto.imageId = track.imageId;
    dto.imageUrl = imageUrl;
    return dto;
  }
}
