import { ApiProperty } from '@nestjs/swagger';
import { PostCategory } from '../../../domain/entities/post-category.entity';

export class CategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: String, nullable: true }) parentId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(category: PostCategory): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.slug = category.slug;
    dto.name = category.name;
    dto.description = category.description;
    dto.parentId = category.parentId;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;
    return dto;
  }
}
