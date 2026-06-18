import { Inject, Injectable } from '@nestjs/common';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error';
import { TagNotFoundError } from '../../domain/errors/tag-not-found.error';
import { resolveSlug } from '../../domain/value-objects/slug.vo';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
  type UpdatePostPatch,
} from '../ports/post-repository.port';
import {
  POST_CATEGORY_REPOSITORY,
  type PostCategoryRepositoryPort,
} from '../ports/post-category-repository.port';
import {
  POST_TAG_REPOSITORY,
  type PostTagRepositoryPort,
} from '../ports/post-tag-repository.port';

export interface UpdatePostInput {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  content?: string;
  coverImageId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
}

@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
    @Inject(POST_CATEGORY_REPOSITORY)
    private readonly categories: PostCategoryRepositoryPort,
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepositoryPort,
  ) {}

  async execute(
    id: string,
    input: UpdatePostInput,
  ): Promise<PostWithRelations> {
    const existing = await this.posts.findById(id);
    if (!existing) throw new PostNotFoundError(id);

    const patch: UpdatePostPatch = {
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      coverImageId: input.coverImageId,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      categoryId: input.categoryId,
      tagIds: input.tagIds,
    };

    // Slug: si llega `slug` o cambia el `title`, recalcular y validar unicidad.
    if (input.slug !== undefined || input.title !== undefined) {
      const nextSlug = resolveSlug(
        input.slug ?? existing.slug,
        input.title ?? existing.title,
      );
      if (nextSlug !== existing.slug) {
        if (await this.posts.existsSlug(nextSlug, id)) {
          throw new SlugAlreadyExistsError(nextSlug);
        }
        patch.slug = nextSlug;
      }
    }

    if (input.categoryId) {
      const category = await this.categories.findById(input.categoryId);
      if (!category) throw new CategoryNotFoundError(input.categoryId);
    }

    if (input.tagIds && input.tagIds.length > 0) {
      const missing = await this.tags.findMissingId(input.tagIds);
      if (missing) throw new TagNotFoundError(missing);
    }

    return this.posts.update(id, patch);
  }
}
