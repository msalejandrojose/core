import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostCategory } from '../../domain/entities/post-category.entity';
import {
  POST_CATEGORY_REPOSITORY,
  type ListCategoriesOptions,
  type PostCategoryRepositoryPort,
} from '../ports/post-category-repository.port';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(POST_CATEGORY_REPOSITORY)
    private readonly categories: PostCategoryRepositoryPort,
  ) {}

  // Admin: offset-paginado (jump-to-page para tablas del backoffice).
  execute(opts: ListCategoriesOptions): Promise<PaginatedResult<PostCategory>> {
    return this.categories.list(opts);
  }

  // Público: solo categorías con contenido publicado.
  listPublic(): Promise<PostCategory[]> {
    return this.categories.listPublic();
  }
}
