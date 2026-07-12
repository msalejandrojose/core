import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import { type SiteCategory } from '../../../domain/value-objects/site-category.vo';

const SITE_CATEGORIES: SiteCategory[] = [
  'RESTAURANT',
  'NATURE',
  'CULTURE',
  'LEISURE',
  'OTHER',
];

export class ListSitesQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: SITE_CATEGORIES })
  @IsOptional()
  @IsIn(SITE_CATEGORIES)
  category?: SiteCategory;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre (contains).' })
  @IsOptional()
  @IsString()
  nameContains?: string;
}
