import { ApiProperty } from '@nestjs/swagger';
import { Track, TrackTheme } from '../../../domain/entities/track.entity';
import { TrackCellDto } from './track-cell.dto';

// A diferencia de TrackResponseDto (listado, sin geometría), este expone el
// circuito completo. Lo usa el cliente para construir un circuito que no
// tenga en su catálogo local (TASK-245) — típicamente uno nacido en el
// backoffice, o una manga de Grand Prix.
export class TrackDetailResponseDto {
  @ApiProperty({ example: 'kenney-01' }) slug!: string;
  @ApiProperty({ example: 'Kenney' }) name!: string;
  @ApiProperty() sectorCount!: number;
  @ApiProperty({ type: [TrackCellDto] }) path!: TrackCellDto[];
  @ApiProperty({ enum: TrackTheme }) theme!: TrackTheme;
  @ApiProperty() grip!: number;

  static fromTrack(track: Track): TrackDetailResponseDto {
    const dto = new TrackDetailResponseDto();
    dto.slug = track.slug;
    dto.name = track.name;
    dto.sectorCount = track.sectorCount;
    dto.path = track.path;
    dto.theme = track.theme;
    dto.grip = track.grip;
    return dto;
  }
}
