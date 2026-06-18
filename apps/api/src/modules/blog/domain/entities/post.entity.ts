import { PostStatus } from '../value-objects/post-status.vo';
import { PostCategory } from './post-category.entity';
import { PostTag } from './post-tag.entity';

// Referencia ligera al autor (un `User` de tipo BACKOFFICE). El módulo blog no
// posee el agregado User; solo expone lo justo para pintar la firma.
export interface PostAuthorRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

// El artículo del blog. Entidad de dominio pura.
export interface Post {
  id: string;
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
  viewCount: number;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Post con sus relaciones resueltas (categoría, etiquetas, autor). Lo devuelve
// el repositorio en lecturas de detalle y de listado para no hacer N+1.
export interface PostWithRelations extends Post {
  category: PostCategory | null;
  tags: PostTag[];
  author: PostAuthorRef | null;
}
