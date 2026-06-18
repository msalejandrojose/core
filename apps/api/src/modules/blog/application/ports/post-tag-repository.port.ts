import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostTag } from '../../domain/entities/post-tag.entity';

export const POST_TAG_REPOSITORY = Symbol('BLOG_POST_TAG_REPOSITORY');

export interface CreateTagData {
  slug: string;
  name: string;
}

export interface UpdateTagPatch {
  slug?: string;
  name?: string;
}

export interface ListTagsOptions {
  page: number;
  limit: number;
  nameContains?: string;
}

export interface PostTagRepositoryPort {
  create(data: CreateTagData): Promise<PostTag>;
  update(id: string, patch: UpdateTagPatch): Promise<PostTag>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<PostTag | null>;
  // Comprueba que todos los ids existen; devuelve el primero que falta o null.
  findMissingId(ids: string[]): Promise<string | null>;
  existsSlug(slug: string, exceptId?: string): Promise<boolean>;
  list(opts: ListTagsOptions): Promise<PaginatedResult<PostTag>>;
  // Etiquetas con al menos 1 post publicado/visible (para el front público).
  listPublic(): Promise<PostTag[]>;
}
