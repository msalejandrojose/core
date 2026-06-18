import { Inject, Injectable } from '@nestjs/common';
import { PostTag } from '../../domain/entities/post-tag.entity';
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error';
import { resolveSlug } from '../../domain/value-objects/slug.vo';
import {
  POST_TAG_REPOSITORY,
  type PostTagRepositoryPort,
} from '../ports/post-tag-repository.port';

export interface CreateTagInput {
  name: string;
  slug?: string;
}

@Injectable()
export class CreateTagUseCase {
  constructor(
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepositoryPort,
  ) {}

  async execute(input: CreateTagInput): Promise<PostTag> {
    const slug = resolveSlug(input.slug, input.name);
    if (await this.tags.existsSlug(slug)) {
      throw new SlugAlreadyExistsError(slug);
    }
    return this.tags.create({ slug, name: input.name });
  }
}
