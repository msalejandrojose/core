import { Inject, Injectable } from '@nestjs/common';
import { PostCategory } from '../../domain/entities/post-category.entity';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error';
import { resolveSlug } from '../../domain/value-objects/slug.vo';
import {
  POST_CATEGORY_REPOSITORY,
  type PostCategoryRepositoryPort,
} from '../ports/post-category-repository.port';

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(POST_CATEGORY_REPOSITORY)
    private readonly categories: PostCategoryRepositoryPort,
  ) {}

  async execute(input: CreateCategoryInput): Promise<PostCategory> {
    const slug = resolveSlug(input.slug, input.name);
    if (await this.categories.existsSlug(slug)) {
      throw new SlugAlreadyExistsError(slug);
    }
    if (input.parentId) {
      const parent = await this.categories.findById(input.parentId);
      if (!parent) throw new CategoryNotFoundError(input.parentId);
    }
    return this.categories.create({
      slug,
      name: input.name,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
    });
  }
}
