import { ApiProperty } from '@nestjs/swagger';
import { AdminTrackPopularityEntry } from '../../../application/ports/lap-time-repository.port';

export class AdminTrackPopularityEntryResponseDto {
  @ApiProperty() trackId!: string;
  @ApiProperty() trackSlug!: string;
  @ApiProperty() trackName!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ example: 1284 }) totalLaps!: number;
  @ApiProperty({ example: 42 }) distinctPlayers!: number;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastPlayedAt!: Date | null;
  @ApiProperty({ example: 96 }) lapsLast30d!: number;
  @ApiProperty({ example: 130 }) lapsPrev30d!: number;

  static fromEntry(
    entry: AdminTrackPopularityEntry,
  ): AdminTrackPopularityEntryResponseDto {
    const dto = new AdminTrackPopularityEntryResponseDto();
    dto.trackId = entry.trackId;
    dto.trackSlug = entry.trackSlug;
    dto.trackName = entry.trackName;
    dto.isActive = entry.isActive;
    dto.totalLaps = entry.totalLaps;
    dto.distinctPlayers = entry.distinctPlayers;
    dto.lastPlayedAt = entry.lastPlayedAt;
    dto.lapsLast30d = entry.lapsLast30d;
    dto.lapsPrev30d = entry.lapsPrev30d;
    return dto;
  }
}

export class AdminTrackPopularityListResponseDto {
  @ApiProperty({ type: [AdminTrackPopularityEntryResponseDto] })
  items!: AdminTrackPopularityEntryResponseDto[];

  static fromDomain(
    entries: AdminTrackPopularityEntry[],
  ): AdminTrackPopularityListResponseDto {
    const dto = new AdminTrackPopularityListResponseDto();
    dto.items = entries.map((e) => AdminTrackPopularityEntryResponseDto.fromEntry(e));
    return dto;
  }
}
