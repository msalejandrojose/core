import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { type SiteEntryStatus } from '../../../domain/value-objects/site-entry-status.vo';

const SITE_ENTRY_STATUSES: SiteEntryStatus[] = ['WANT_TO_GO', 'VISITED'];

export class SetSiteEntryStatusDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  siteId!: string;

  @ApiProperty({
    enum: SITE_ENTRY_STATUSES,
    description:
      'WANT_TO_GO: wishlist. VISITED: marca visitado sin puntuar todavía — para puntuar usa el flujo de rating (POST /andanzas/site-entries/:siteId/rating).',
  })
  @IsIn(SITE_ENTRY_STATUSES)
  status!: SiteEntryStatus;
}
