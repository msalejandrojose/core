import { ApiProperty } from '@nestjs/swagger';
import { AdminLapTimeListEntry } from '../../../application/ports/lap-time-repository.port';

export class AdminLapTimeListEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userEmail!: string;
  @ApiProperty() userDisplayName!: string;
  @ApiProperty() trackId!: string;
  @ApiProperty() trackSlug!: string;
  @ApiProperty() trackName!: string;
  @ApiProperty({ example: 42350 }) durationMs!: number;
  @ApiProperty({ type: [Number] }) splitsMs!: number[];
  @ApiProperty() clientVersion!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Null = tiempo válido.',
  })
  invalidatedAt!: Date | null;
  @ApiProperty({
    description:
      'Es el mejor tiempo válido de este jugador en este circuito (con empates, puede repetirse).',
  })
  isPersonalBest!: boolean;

  static fromEntry(
    entry: AdminLapTimeListEntry,
  ): AdminLapTimeListEntryResponseDto {
    const dto = new AdminLapTimeListEntryResponseDto();
    dto.id = entry.id;
    dto.userId = entry.userId;
    dto.userEmail = entry.userEmail;
    dto.userDisplayName = entry.userDisplayName;
    dto.trackId = entry.trackId;
    dto.trackSlug = entry.trackSlug;
    dto.trackName = entry.trackName;
    dto.durationMs = entry.durationMs;
    dto.splitsMs = entry.splitsMs;
    dto.clientVersion = entry.clientVersion;
    dto.createdAt = entry.createdAt;
    dto.invalidatedAt = entry.invalidatedAt;
    dto.isPersonalBest = entry.isPersonalBest;
    return dto;
  }
}
