import { Inject, Injectable } from '@nestjs/common';
import { PostCategory } from '../../domain/entities/post-category.entity';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error';
import { resolveSlug } from '../../domain/value-objects/slug.vo';
import {
  POST_CATEGORY_REPOSITORY,
  type PostCategoryRepositoryPort,
  type UpdateCategoryPatch,
} from '../ports/post-category-repository.port';

export interface UpdateCategoryInput {
  slug?: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(POST_CATEGORY_REPOSITORY)
    private readonly categories: PostCategoryRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateCategoryInput): Promise<PostCategory> {
    const existing = await this.categories.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    const patch: UpdateCategoryPatch = {
      name: input.name,
      description: input.description,
      parentId: input.parentId,
    };

    if (input.slug !== undefined || input.name !== undefined) {
      const nextSlug = resolveSlug(
        input.slug ?? existing.slug,
        input.name ?? existing.name,
      );
      if (nextSlug !== existing.slug) {
        if (await this.categories.existsSlug(nextSlug, id)) {
          throw new SlugAlreadyExistsError(nextSlug);
        }
        patch.slug = nextSlug;
      }
    }

    if (input.parentId) {
      const parent = await this.categories.findById(input.parentId);
      if (!parent) throw new CategoryNotFoundError(input.parentId);
    }

    return this.categories.update(id, patch);
  }
}
