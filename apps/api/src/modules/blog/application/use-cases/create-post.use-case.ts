import { Inject, Injectable } from '@nestjs/common';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error';
import { TagNotFoundError } from '../../domain/errors/tag-not-found.error';
import { resolveSlug } from '../../domain/value-objects/slug.vo';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';
import {
  POST_CATEGORY_REPOSITORY,
  type PostCategoryRepositoryPort,
} from '../ports/post-category-repository.port';
import {
  POST_TAG_REPOSITORY,
  type PostTagRepositoryPort,
} from '../ports/post-tag-repository.port';

export interface CreatePostInput {
  title: string;
  content: string;
  slug?: string;
  excerpt?: string | null;
  coverImageId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  authorId?: string | null;
}

@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
    @Inject(POST_CATEGORY_REPOSITORY)
    private readonly categories: PostCategoryRepositoryPort,
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepositoryPort,
  ) {}

  // Un post siempre nace como DRAFT; la publicación/programación se hace con el
  // endpoint `publish` para mantener una sola puerta de transición de estado.
  async execute(input: CreatePostInput): Promise<PostWithRelations> {
    const slug = resolveSlug(input.slug, input.title);
    if (await this.posts.existsSlug(slug)) {
      throw new SlugAlreadyExistsError(slug);
    }

    if (input.categoryId) {
      const category = await this.categories.findById(input.categoryId);
      if (!category) throw new CategoryNotFoundError(input.categoryId);
    }

    const tagIds = input.tagIds ?? [];
    if (tagIds.length > 0) {
      const missing = await this.tags.findMissingId(tagIds);
      if (missing) throw new TagNotFoundError(missing);
    }

    return this.posts.create({
      slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      content: input.content,
      status: 'DRAFT',
      publishedAt: null,
      coverImageId: input.coverImageId ?? null,
      authorId: input.authorId ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      categoryId: input.categoryId ?? null,
      tagIds,
    });
  }
}
