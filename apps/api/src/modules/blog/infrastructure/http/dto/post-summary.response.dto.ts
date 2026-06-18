import { ApiProperty } from '@nestjs/swagger';
import { PostWithRelations } from '../../../domain/entities/post.entity';
import type { PostStatus } from '../../../domain/value-objects/post-status.vo';
import { PostCategoryRefDto } from './post.response.dto';
import { TagResponseDto } from './tag.response.dto';

// Versión ligera para listados: sin `content`, con `excerpt`.
export class PostSummaryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) excerpt: string | null;
  @ApiProperty({ enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] })
  status: PostStatus;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;
  @ApiProperty({ nullable: true }) coverImageId: string | null;
  @ApiProperty({ nullable: true }) coverImageUrl: string | null;
  @ApiProperty() viewCount: number;
  @ApiProperty({ type: PostCategoryRefDto, nullable: true })
  category: PostCategoryRefDto | null;
  @ApiProperty({ type: [TagResponseDto] }) tags: TagResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(post: PostWithRelations): PostSummaryResponseDto {
    const dto = new PostSummaryResponseDto();
    dto.id = post.id;
    dto.slug = post.slug;
    dto.title = post.title;
    dto.excerpt = post.excerpt;
    dto.status = post.status;
    dto.publishedAt = post.publishedAt;
    dto.coverImageId = post.coverImageId;
    dto.coverImageUrl = null;
    dto.viewCount = post.viewCount;
    dto.category = post.category
      ? {
          id: post.category.id,
          slug: post.category.slug,
          name: post.category.name,
        }
      : null;
    dto.tags = post.tags.map((t) => TagResponseDto.fromDomain(t));
    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;
    return dto;
  }
}
