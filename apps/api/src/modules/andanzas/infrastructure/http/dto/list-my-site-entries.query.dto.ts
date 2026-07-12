import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import { type SiteEntryStatus } from '../../../domain/value-objects/site-entry-status.vo';

const SITE_ENTRY_STATUSES: SiteEntryStatus[] = ['WANT_TO_GO', 'VISITED'];

export class ListMySiteEntriesQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: SITE_ENTRY_STATUSES })
  @IsOptional()
  @IsIn(SITE_ENTRY_STATUSES)
  status?: SiteEntryStatus;
}
