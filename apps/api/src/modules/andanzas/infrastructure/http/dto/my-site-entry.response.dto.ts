import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SiteEntryWithSite } from '../../../domain/entities/site-entry.entity';
import { type SiteEntryStatus } from '../../../domain/value-objects/site-entry-status.vo';
import { SiteResponseDto } from './site.response.dto';

export class MySiteEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: SiteEntryStatus;

  @ApiPropertyOptional({ nullable: true })
  score!: number | null;

  @ApiProperty({ type: SiteResponseDto })
  site!: SiteResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static fromEntry(entry: SiteEntryWithSite): MySiteEntryResponseDto {
    const dto = new MySiteEntryResponseDto();
    dto.id = entry.id;
    dto.status = entry.status;
    dto.score = entry.score;
    dto.site = SiteResponseDto.fromSite(entry.site);
    dto.createdAt = entry.createdAt;
    return dto;
  }
}
