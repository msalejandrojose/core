import { ApiProperty } from '@nestjs/swagger';
import type { GrandPrixCircuitWeather } from '../../../domain/entities/grand-prix.entity';
import { RacingCircuit } from '../../../domain/entities/racing-circuit.entity';
import { TrackTheme } from '../../../domain/entities/track.entity';
import { TrackCellDto } from './track-cell.dto';

export class AdminCircuitResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'nevado' }) slug!: string;
  @ApiProperty({ example: 'Nevado' }) name!: string;
  @ApiProperty() checkpoints!: number;
  @ApiProperty({ type: [TrackCellDto] }) path!: TrackCellDto[];
  @ApiProperty({ enum: TrackTheme }) theme!: TrackTheme;
  @ApiProperty({ enum: ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY'] })
  weather!: GrandPrixCircuitWeather;
  @ApiProperty() grip!: number;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) imageId!:
    | string
    | null;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({
    description: 'Si está entre los circuitos destacados HOY (lo decide el rotador diario).',
  })
  isInRotation!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) rotatedAt!:
    | string
    | null;

  // `imageUrl` se resuelve fuera (el controller, con `FileViewTokenService`):
  // el dominio guarda solo el id del fichero, no sabe construir URLs.
  static fromDomain(
    circuit: RacingCircuit,
    imageUrl: string | null = null,
  ): AdminCircuitResponseDto {
    const dto = new AdminCircuitResponseDto();
    dto.id = circuit.id;
    dto.slug = circuit.slug;
    dto.name = circuit.name;
    dto.checkpoints = circuit.checkpoints;
    dto.path = circuit.path;
    dto.theme = circuit.theme;
    dto.weather = circuit.weather;
    dto.grip = circuit.grip;
    dto.imageId = circuit.imageId;
    dto.imageUrl = imageUrl;
    dto.isActive = circuit.isActive;
    dto.isInRotation = circuit.isInRotation;
    dto.rotatedAt = circuit.rotatedAt ? circuit.rotatedAt.toISOString() : null;
    return dto;
  }
}
