import { CursorPage } from '../../../../shared/pagination';
import { SiteWithTags } from '../../domain/entities/site.entity';
import { SiteCategory } from '../../domain/value-objects/site-category.vo';

export const SITE_REPOSITORY = Symbol('SITE_REPOSITORY');

export interface CreateSiteData {
  name: string;
  category: SiteCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  externalPlaceId: string | null;
  createdByUserId: string;
  tagIds: string[];
}

export interface ListSitesOptions {
  limit: number;
  cursor?: string;
  category?: SiteCategory;
  nameContains?: string;
}

export interface SiteRepositoryPort {
  create(data: CreateSiteData): Promise<SiteWithTags>;
  findById(id: string): Promise<SiteWithTags | null>;
  // Para deduplicar sitios resueltos desde el proveedor externo (TASK-165):
  // dos usuarios buscando el mismo lugar deben reutilizar el mismo Site.
  findByExternalPlaceId(externalPlaceId: string): Promise<SiteWithTags | null>;
  list(opts: ListSitesOptions): Promise<CursorPage<SiteWithTags>>;
}
