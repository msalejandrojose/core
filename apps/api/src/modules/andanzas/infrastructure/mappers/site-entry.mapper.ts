import {
  SiteEntry as SiteEntryRow,
  Site as SiteRow,
  SiteTag as SiteTagRow,
  Tag as TagRow,
} from '../../../../generated/prisma/client';
import {
  SiteEntry,
  SiteEntryWithSite,
} from '../../domain/entities/site-entry.entity';
import { SiteEntryStatus } from '../../domain/value-objects/site-entry-status.vo';
import { SiteMapper, SiteRowWithTags } from './site.mapper';

export interface SiteEntryRowWithSite extends SiteEntryRow {
  site: SiteRow & { tags: (SiteTagRow & { tag: TagRow })[] };
}

export class SiteEntryMapper {
  static toDomain(row: SiteEntryRow): SiteEntry {
    return {
      id: row.id,
      userId: row.userId,
      siteId: row.siteId,
      status: row.status as SiteEntryStatus,
      score: row.score?.toNumber() ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toDomainWithSite(row: SiteEntryRowWithSite): SiteEntryWithSite {
    return {
      ...SiteEntryMapper.toDomain(row),
      site: SiteMapper.toDomain(row.site as SiteRowWithTags),
    };
  }
}
