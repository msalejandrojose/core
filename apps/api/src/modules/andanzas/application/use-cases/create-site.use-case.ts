import { Inject, Injectable } from '@nestjs/common';
import { SiteWithTags } from '../../domain/entities/site.entity';
import { SiteCategory } from '../../domain/value-objects/site-category.vo';
import { TooManyTagsError } from '../../domain/errors/too-many-tags.error';
import { normalizeTagName } from '../../domain/tags/normalize-tag-name';
import { MAX_TAGS_PER_SITE } from '../../domain/tags/suggest-tags';
import {
  SITE_REPOSITORY,
  type SiteRepositoryPort,
} from '../ports/site-repository.port';
import {
  TAG_REPOSITORY,
  type TagRepositoryPort,
} from '../ports/tag-repository.port';

export interface CreateSiteInput {
  createdByUserId: string;
  name: string;
  category: SiteCategory;
  latitude: number;
  longitude: number;
  address?: string;
  tagNames?: string[];
}

@Injectable()
export class CreateSiteUseCase {
  constructor(
    @Inject(SITE_REPOSITORY) private readonly sites: SiteRepositoryPort,
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepositoryPort,
  ) {}

  async execute(input: CreateSiteInput): Promise<SiteWithTags> {
    const tagNames = input.tagNames ?? [];
    if (tagNames.length > MAX_TAGS_PER_SITE) {
      throw new TooManyTagsError(tagNames.length, MAX_TAGS_PER_SITE);
    }

    // Normaliza y deduplica antes de tocar la BBDD (dos variantes del mismo
    // nombre en la misma petición no deben crear/enlazar el tag dos veces).
    const normalizedNames = [...new Set(tagNames.map(normalizeTagName))].filter(
      (name) => name !== '',
    );
    const tags = await Promise.all(
      normalizedNames.map((name) => this.tags.upsertByName(name)),
    );

    return this.sites.create({
      name: input.name,
      category: input.category,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address ?? null,
      createdByUserId: input.createdByUserId,
      tagIds: tags.map((tag) => tag.id),
    });
  }
}
