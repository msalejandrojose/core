import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import { POST_STATUSES } from '../../../domain/value-objects/post-status.vo';
import type { PostStatus } from '../../../domain/value-objects/post-status.vo';

// Listado de administración: cursor-paginado (hereda `limit`/`cursor`/`sort`).
export class ListPostsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: POST_STATUSES })
  @IsOptional()
  @IsIn(POST_STATUSES)
  status?: PostStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleContains?: string;
}
