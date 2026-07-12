import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SiteEntry } from '../../../domain/entities/site-entry.entity';
import { type SiteEntryStatus } from '../../../domain/value-objects/site-entry-status.vo';

export class SiteEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  siteId!: string;

  @ApiProperty()
  status!: SiteEntryStatus;

  @ApiPropertyOptional({ nullable: true, description: '0-10, null si aún no se ha puntuado.' })
  score!: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static fromEntry(entry: SiteEntry): SiteEntryResponseDto {
    const dto = new SiteEntryResponseDto();
    dto.id = entry.id;
    dto.siteId = entry.siteId;
    dto.status = entry.status;
    dto.score = entry.score;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}
