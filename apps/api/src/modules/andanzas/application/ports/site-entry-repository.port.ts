import { CursorPage } from '../../../../shared/pagination';
import {
  SiteEntry,
  SiteEntryWithSite,
} from '../../domain/entities/site-entry.entity';
import { SiteEntryStatus } from '../../domain/value-objects/site-entry-status.vo';

export const SITE_ENTRY_REPOSITORY = Symbol('SITE_ENTRY_REPOSITORY');

export interface UpsertSiteEntryStatusData {
  userId: string;
  siteId: string;
  status: SiteEntryStatus;
}

export interface ListMySiteEntriesOptions {
  userId: string;
  status?: SiteEntryStatus;
  limit: number;
  cursor?: string;
}

export interface SiteEntryRepositoryPort {
  findByUserAndSite(userId: string, siteId: string): Promise<SiteEntry | null>;
  // Crea la entry si no existe, o actualiza solo el status si ya existe
  // (nunca toca `score` — eso es cosa de `updateScore`).
  upsertStatus(data: UpsertSiteEntryStatusData): Promise<SiteEntry>;
  updateScore(entryId: string, score: number): Promise<SiteEntry>;
  // Bucket de la banda de sentimiento: VISITED con score en [min, max],
  // ordenado mejor→peor (score DESC), excluyendo la entry que se está
  // puntuando.
  listRankedBucket(
    userId: string,
    scoreRange: { min: number; max: number },
    excludeEntryId: string,
  ): Promise<SiteEntry[]>;
  listByUser(opts: ListMySiteEntriesOptions): Promise<CursorPage<SiteEntryWithSite>>;
}
