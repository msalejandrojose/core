import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SiteWithTags } from '../../../domain/entities/site.entity';
import { type SiteCategory } from '../../../domain/value-objects/site-category.vo';

export class SiteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: SiteCategory;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static fromSite(site: SiteWithTags): SiteResponseDto {
    const dto = new SiteResponseDto();
    dto.id = site.id;
    dto.name = site.name;
    dto.category = site.category;
    dto.latitude = site.latitude;
    dto.longitude = site.longitude;
    dto.address = site.address;
    dto.tags = site.tags.map((tag) => tag.name);
    dto.createdAt = site.createdAt;
    return dto;
  }
}
