import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { ListPublishedPostsUseCase } from '../../application/use-cases/list-published-posts.use-case';
import { GetPublicPostUseCase } from '../../application/use-cases/get-public-post.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { ListTagsUseCase } from '../../application/use-cases/list-tags.use-case';
import { ListPublicPostsQueryDto } from './dto/list-public-posts.query.dto';
import { PostResponseDto } from './dto/post.response.dto';
import { PostSummaryResponseDto } from './dto/post-summary.response.dto';
import { CategoryResponseDto } from './dto/category.response.dto';
import { TagResponseDto } from './dto/tag.response.dto';

// Endpoints públicos del blog: sin autenticación, solo lectura de contenido
// visible (PUBLISHED o SCHEDULED ya vencido). Nunca exponen borradores.
@ApiTags('blog')
@Public()
@Controller('blog/public')
export class PublicBlogController {
  constructor(
    private readonly listPublished: ListPublishedPostsUseCase,
    private readonly getPublicPost: GetPublicPostUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly listTags: ListTagsUseCase,
  ) {}

  @Get('posts')
  @ApiOperation({
    summary: 'Listar posts publicados (cursor, publishedAt DESC).',
  })
  @ApiCursorPaginatedResponse(PostSummaryResponseDto)
  async listPosts(
    @Query() query: ListPublicPostsQueryDto,
  ): Promise<CursorPaginatedResponseDto<PostSummaryResponseDto>> {
    const page = await this.listPublished.execute({
      limit: query.limit ?? 20,
      cursor: query.cursor,
      categorySlug: query.categorySlug,
      tagSlug: query.tagSlug,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((p) => PostSummaryResponseDto.fromDomain(p)),
      page.nextCursor,
      query.limit ?? 20,
    );
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Detalle de un post publicado por slug.' })
  @ApiOkResponse({ type: PostResponseDto })
  async getPost(@Param('slug') slug: string): Promise<PostResponseDto> {
    return PostResponseDto.fromDomain(await this.getPublicPost.execute(slug));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Categorías con al menos un post publicado.' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  async categories(): Promise<CategoryResponseDto[]> {
    const categories = await this.listCategories.listPublic();
    return categories.map((c) => CategoryResponseDto.fromDomain(c));
  }

  @Get('tags')
  @ApiOperation({ summary: 'Etiquetas con al menos un post publicado.' })
  @ApiOkResponse({ type: [TagResponseDto] })
  async tags(): Promise<TagResponseDto[]> {
    const tags = await this.listTags.listPublic();
    return tags.map((t) => TagResponseDto.fromDomain(t));
  }
}
