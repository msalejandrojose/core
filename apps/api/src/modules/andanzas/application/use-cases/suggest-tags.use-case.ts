import { Inject, Injectable } from '@nestjs/common';
import { normalizeTagName } from '../../domain/tags/normalize-tag-name';
import {
  MAX_TAG_SUGGESTIONS,
  suggestTags,
  TagSuggestion,
} from '../../domain/tags/suggest-tags';
import {
  TAG_REPOSITORY,
  type TagRepositoryPort,
} from '../ports/tag-repository.port';

// Candidatos que se piden a BBDD antes de aplicar el orden/límite final del
// dominio — más holgado que MAX_TAG_SUGGESTIONS para que suggestTags tenga
// margen de sobra donde elegir sin volver a golpear la BBDD.
const CANDIDATE_POOL_SIZE = 50;

@Injectable()
export class SuggestTagsUseCase {
  constructor(
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepositoryPort,
  ) {}

  async execute(query: string): Promise<TagSuggestion[]> {
    const normalized = normalizeTagName(query);
    if (normalized === '') return [];

    const candidates = await this.tags.searchByPrefix(
      normalized,
      CANDIDATE_POOL_SIZE,
    );
    return suggestTags(normalized, candidates, MAX_TAG_SUGGESTIONS);
  }
}
