import { Tag as PrismaTag } from '../../../../generated/prisma/client';
import { Tag } from '../../domain/entities/tag.entity';

export class TagMapper {
  static toDomain(row: PrismaTag): Tag {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
    };
  }
}
