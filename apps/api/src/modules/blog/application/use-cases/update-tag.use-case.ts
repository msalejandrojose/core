import { Inject, Injectable } from '@nestjs/common';
import { PostTag } from '../../domain/entities/post-tag.entity';
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error';
import { TagNotFoundError } from '../../domain/errors/tag-not-found.error';
import { resolveSlug } from '../../domain/value-objects/slug.vo';
import {
  POST_TAG_REPOSITORY,
  type PostTagRepositoryPort,
  type UpdateTagPatch,
} from '../ports/post-tag-repository.port';

export interface UpdateTagInput {
  slug?: string;
  name?: string;
}

@Injectable()
export class UpdateTagUseCase {
  constructor(
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateTagInput): Promise<PostTag> {
    const existing = await this.tags.findById(id);
    if (!existing) throw new TagNotFoundError(id);

    const patch: UpdateTagPatch = { name: input.name };

    if (input.slug !== undefined || input.name !== undefined) {
      const nextSlug = resolveSlug(
        input.slug ?? existing.slug,
        input.name ?? existing.name,
      );
      if (nextSlug !== existing.slug) {
        if (await this.tags.existsSlug(nextSlug, id)) {
          throw new SlugAlreadyExistsError(nextSlug);
        }
        patch.slug = nextSlug;
      }
    }

    return this.tags.update(id, patch);
  }
}
