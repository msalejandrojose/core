import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import {
  POST_CATEGORY_REPOSITORY,
  type PostCategoryRepositoryPort,
} from '../ports/post-category-repository.port';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(POST_CATEGORY_REPOSITORY)
    private readonly categories: PostCategoryRepositoryPort,
  ) {}

  // Borrar una categoría con posts NO bloquea: la FK es onDelete:SetNull, así
  // que los posts asociados quedan sin categoría.
  async execute(id: string): Promise<void> {
    const existing = await this.categories.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);
    await this.categories.delete(id);
  }
}
