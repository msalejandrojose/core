import {
  Site as SiteRow,
  SiteTag as SiteTagRow,
  Tag as TagRow,
} from '../../../../generated/prisma/client';
import { SiteWithTags } from '../../domain/entities/site.entity';
import { SiteCategory } from '../../domain/value-objects/site-category.vo';
import { TagMapper } from './tag.mapper';

// Forma de fila que devuelve el repositorio al incluir los tags (join
// SiteTag → Tag).
export interface SiteRowWithTags extends SiteRow {
  tags: (SiteTagRow & { tag: TagRow })[];
}

export class SiteMapper {
  static toDomain(row: SiteRowWithTags): SiteWithTags {
    return {
      id: row.id,
      name: row.name,
      category: row.category as SiteCategory,
      latitude: row.latitude.toNumber(),
      longitude: row.longitude.toNumber(),
      address: row.address,
      externalPlaceId: row.externalPlaceId,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: row.tags.map((t) => TagMapper.toDomain(t.tag)),
    };
  }
}
