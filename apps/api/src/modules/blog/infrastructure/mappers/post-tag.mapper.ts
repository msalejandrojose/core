import { PostTag as PostTagRow } from '../../../../generated/prisma/client';
import { PostTag } from '../../domain/entities/post-tag.entity';

export class PostTagMapper {
  static toDomain(row: PostTagRow): PostTag {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      createdAt: row.createdAt,
    };
  }
}
