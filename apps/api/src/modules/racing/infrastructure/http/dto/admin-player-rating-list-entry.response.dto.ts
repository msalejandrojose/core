import { ApiProperty } from '@nestjs/swagger';
import { AdminPlayerRatingListEntry } from '../../../application/ports/player-rating-repository.port';

export class AdminPlayerRatingListEntryResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() userEmail!: string;
  @ApiProperty() userDisplayName!: string;
  @ApiProperty({ example: 1016 }) rating!: number;

  static fromEntry(
    entry: AdminPlayerRatingListEntry,
  ): AdminPlayerRatingListEntryResponseDto {
    const dto = new AdminPlayerRatingListEntryResponseDto();
    dto.userId = entry.userId;
    dto.userEmail = entry.userEmail;
    dto.userDisplayName = entry.userDisplayName;
    dto.rating = entry.rating;
    return dto;
  }
}
