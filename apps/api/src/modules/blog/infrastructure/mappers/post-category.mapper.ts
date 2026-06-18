import { PostCategory as PostCategoryRow } from '../../../../generated/prisma/client';
import { PostCategory } from '../../domain/entities/post-category.entity';

export class PostCategoryMapper {
  static toDomain(row: PostCategoryRow): PostCategory {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      parentId: row.parentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
