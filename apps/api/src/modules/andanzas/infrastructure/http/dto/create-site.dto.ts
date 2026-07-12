import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { type SiteCategory } from '../../../domain/value-objects/site-category.vo';
import { MAX_TAGS_PER_SITE } from '../../../domain/tags/suggest-tags';

const SITE_CATEGORIES: SiteCategory[] = [
  'RESTAURANT',
  'NATURE',
  'CULTURE',
  'LEISURE',
  'OTHER',
];

export class CreateSiteDto {
  @ApiProperty({ maxLength: 255, example: 'Chiringuito de la playa' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: SITE_CATEGORIES })
  @IsIn(SITE_CATEGORIES)
  category!: SiteCategory;

  @ApiProperty({ example: 36.5 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -4.9 })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: MAX_TAGS_PER_SITE,
    example: ['playa', 'vistas al mar'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TAGS_PER_SITE)
  @IsString({ each: true })
  tagNames?: string[];
}
