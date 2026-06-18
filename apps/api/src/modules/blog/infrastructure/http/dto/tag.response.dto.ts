import { ApiProperty } from '@nestjs/swagger';
import { PostTag } from '../../../domain/entities/post-tag.entity';

export class TagResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;

  static fromDomain(tag: PostTag): TagResponseDto {
    const dto = new TagResponseDto();
    dto.id = tag.id;
    dto.slug = tag.slug;
    dto.name = tag.name;
    dto.createdAt = tag.createdAt;
    return dto;
  }
}
