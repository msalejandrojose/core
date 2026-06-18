import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostCategory } from '../../domain/entities/post-category.entity';

export const POST_CATEGORY_REPOSITORY = Symbol('BLOG_POST_CATEGORY_REPOSITORY');

export interface CreateCategoryData {
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
}

export interface UpdateCategoryPatch {
  slug?: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

export interface ListCategoriesOptions {
  page: number;
  limit: number;
  nameContains?: string;
  parentId?: string | null;
}

export interface PostCategoryRepositoryPort {
  create(data: CreateCategoryData): Promise<PostCategory>;
  update(id: string, patch: UpdateCategoryPatch): Promise<PostCategory>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<PostCategory | null>;
  existsSlug(slug: string, exceptId?: string): Promise<boolean>;
  list(opts: ListCategoriesOptions): Promise<PaginatedResult<PostCategory>>;
  // Categorías con al menos 1 post publicado/visible (para el front público).
  listPublic(): Promise<PostCategory[]>;
}
