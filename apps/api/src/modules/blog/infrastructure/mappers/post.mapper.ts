import {
  Post as PostRow,
  PostCategory as PostCategoryRow,
  PostTag as PostTagRow,
  PostTagOnPost as PostTagOnPostRow,
} from '../../../../generated/prisma/client';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { PostCategoryMapper } from './post-category.mapper';
import { PostTagMapper } from './post-tag.mapper';

// Forma de fila que devuelve el repositorio al incluir las relaciones. El
// `author` se trae con `select` reducido (no exponemos el User completo).
export interface PostRowWithRelations extends PostRow {
  category: PostCategoryRow | null;
  tags: (PostTagOnPostRow & { tag: PostTagRow })[];
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export class PostMapper {
  static toDomain(row: PostRowWithRelations): PostWithRelations {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      status: row.status,
      publishedAt: row.publishedAt,
      coverImageId: row.coverImageId,
      authorId: row.authorId,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      viewCount: row.viewCount,
      categoryId: row.categoryId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category: row.category ? PostCategoryMapper.toDomain(row.category) : null,
      tags: row.tags.map((t) => PostTagMapper.toDomain(t.tag)),
      author: row.author
        ? {
            id: row.author.id,
            firstName: row.author.firstName,
            lastName: row.author.lastName,
          }
        : null,
    };
  }
}
