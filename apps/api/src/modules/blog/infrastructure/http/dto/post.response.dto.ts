import { ApiProperty } from '@nestjs/swagger';
import { PostWithRelations } from '../../../domain/entities/post.entity';
import type { PostStatus } from '../../../domain/value-objects/post-status.vo';
import { TagResponseDto } from './tag.response.dto';

// Versión resumida de la categoría para anidar en la respuesta de un post.
export class PostCategoryRefDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
}

// Firma del autor (subconjunto del User).
export class PostAuthorRefDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: String, nullable: true }) firstName: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName: string | null;
}

// Detalle completo de un post (incluye `content`).
export class PostResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) excerpt: string | null;
  @ApiProperty() content: string;
  @ApiProperty({ enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] })
  status: PostStatus;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;
  @ApiProperty({ type: String, nullable: true }) coverImageId: string | null;
  // URL de la portada. En el MVP es FK suave: el front la resuelve con
  // `GET /files/:id`. Se deja el campo para integrarlo con storage más adelante.
  @ApiProperty({ type: String, nullable: true }) coverImageUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) metaTitle: string | null;
  @ApiProperty({ type: String, nullable: true }) metaDescription: string | null;
  @ApiProperty() viewCount: number;
  @ApiProperty({ type: PostCategoryRefDto, nullable: true })
  category: PostCategoryRefDto | null;
  @ApiProperty({ type: [TagResponseDto] }) tags: TagResponseDto[];
  @ApiProperty({ type: PostAuthorRefDto, nullable: true })
  author: PostAuthorRefDto | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(post: PostWithRelations): PostResponseDto {
    const dto = new PostResponseDto();
    dto.id = post.id;
    dto.slug = post.slug;
    dto.title = post.title;
    dto.excerpt = post.excerpt;
    dto.content = post.content;
    dto.status = post.status;
    dto.publishedAt = post.publishedAt;
    dto.coverImageId = post.coverImageId;
    dto.coverImageUrl = null;
    dto.metaTitle = post.metaTitle;
    dto.metaDescription = post.metaDescription;
    dto.viewCount = post.viewCount;
    dto.category = post.category
      ? {
          id: post.category.id,
          slug: post.category.slug,
          name: post.category.name,
        }
      : null;
    dto.tags = post.tags.map((t) => TagResponseDto.fromDomain(t));
    dto.author = post.author
      ? {
          id: post.author.id,
          firstName: post.author.firstName,
          lastName: post.author.lastName,
        }
      : null;
    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;
    return dto;
  }
}
