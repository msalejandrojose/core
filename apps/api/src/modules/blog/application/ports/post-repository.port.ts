import { CursorPage } from '../../../../shared/pagination';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { PostStatus } from '../../domain/value-objects/post-status.vo';

export const POST_REPOSITORY = Symbol('BLOG_POST_REPOSITORY');

export interface CreatePostData {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: PostStatus;
  publishedAt: Date | null;
  coverImageId: string | null;
  authorId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  categoryId: string | null;
  tagIds: string[];
}

// Patch parcial. `undefined` = no tocar; para `tagIds`, un array (aunque vacío)
// reemplaza el set completo de etiquetas; `undefined` lo deja como está.
export interface UpdatePostPatch {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  content?: string;
  coverImageId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
}

export interface ListPostsAdminOptions {
  limit: number;
  cursor?: string;
  status?: PostStatus;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  titleContains?: string;
}

export interface ListPostsPublicOptions {
  limit: number;
  cursor?: string;
  categorySlug?: string;
  tagSlug?: string;
}

export interface PostRepositoryPort {
  create(data: CreatePostData): Promise<PostWithRelations>;
  update(id: string, patch: UpdatePostPatch): Promise<PostWithRelations>;
  delete(id: string): Promise<void>;

  findById(id: string): Promise<PostWithRelations | null>;
  // Detalle público por slug: solo visible (PUBLISHED o SCHEDULED vencido).
  findVisibleBySlug(slug: string): Promise<PostWithRelations | null>;

  listAdmin(
    opts: ListPostsAdminOptions,
  ): Promise<CursorPage<PostWithRelations>>;
  listPublic(
    opts: ListPostsPublicOptions,
  ): Promise<CursorPage<PostWithRelations>>;

  // Cambia el estado editorial (publish/archive). `publishedAt` solo se aplica
  // cuando se pasa explícitamente.
  setStatus(
    id: string,
    status: PostStatus,
    publishedAt?: Date | null,
  ): Promise<PostWithRelations>;

  incrementViewCount(id: string): Promise<void>;

  // ¿Existe ya un post con ese slug? `exceptId` excluye el propio post al editar.
  existsSlug(slug: string, exceptId?: string): Promise<boolean>;
}
