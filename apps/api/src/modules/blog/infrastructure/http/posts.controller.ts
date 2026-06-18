import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CreatePostUseCase } from '../../application/use-cases/create-post.use-case';
import { UpdatePostUseCase } from '../../application/use-cases/update-post.use-case';
import { DeletePostUseCase } from '../../application/use-cases/delete-post.use-case';
import { PublishPostUseCase } from '../../application/use-cases/publish-post.use-case';
import { ArchivePostUseCase } from '../../application/use-cases/archive-post.use-case';
import { GetPostUseCase } from '../../application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '../../application/use-cases/list-posts.use-case';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PublishPostDto } from './dto/publish-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.query.dto';
import { PostResponseDto } from './dto/post.response.dto';
import { PostSummaryResponseDto } from './dto/post-summary.response.dto';

@ApiTags('blog')
@Controller('blog/posts')
export class PostsController {
  constructor(
    private readonly listPosts: ListPostsUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly createPost: CreatePostUseCase,
    private readonly updatePost: UpdatePostUseCase,
    private readonly deletePost: DeletePostUseCase,
    private readonly publishPost: PublishPostUseCase,
    private readonly archivePost: ArchivePostUseCase,
  ) {}

  @Get()
  @RequiresPermission('blog.posts', 'READ')
  @ApiOperation({
    summary: 'Listar posts (todos los estados, cursor paginado).',
  })
  @ApiCursorPaginatedResponse(PostSummaryResponseDto)
  async list(
    @Query() query: ListPostsQueryDto,
  ): Promise<CursorPaginatedResponseDto<PostSummaryResponseDto>> {
    const page = await this.listPosts.execute({
      limit: query.limit ?? 20,
      cursor: query.cursor,
      status: query.status,
      categoryId: query.categoryId,
      tagId: query.tagId,
      authorId: query.authorId,
      titleContains: query.titleContains,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((p) => PostSummaryResponseDto.fromDomain(p)),
      page.nextCursor,
      query.limit ?? 20,
    );
  }

  @Get(':id')
  @RequiresPermission('blog.posts', 'READ')
  @ApiOperation({ summary: 'Obtener un post por id (incluye borradores).' })
  @ApiOkResponse({ type: PostResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<PostResponseDto> {
    return PostResponseDto.fromDomain(await this.getPost.execute(id));
  }

  @Post()
  @RequiresPermission('blog.posts', 'WRITE')
  @ApiOperation({ summary: 'Crear un post (nace como DRAFT).' })
  @ApiCreatedResponse({ type: PostResponseDto })
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<PostResponseDto> {
    const post = await this.createPost.execute({
      title: dto.title,
      content: dto.content,
      slug: dto.slug,
      excerpt: dto.excerpt ?? null,
      coverImageId: dto.coverImageId ?? null,
      categoryId: dto.categoryId ?? null,
      tagIds: dto.tagIds,
      metaTitle: dto.metaTitle ?? null,
      metaDescription: dto.metaDescription ?? null,
      authorId: user?.sub ?? null,
    });
    return PostResponseDto.fromDomain(post);
  }

  @Patch(':id')
  @RequiresPermission('blog.posts', 'WRITE')
  @ApiOperation({ summary: 'Editar un post (campos y/o etiquetas).' })
  @ApiOkResponse({ type: PostResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return PostResponseDto.fromDomain(await this.updatePost.execute(id, dto));
  }

  @Delete(':id')
  @RequiresPermission('blog.posts', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un post (físico).' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deletePost.execute(id);
  }

  @Post(':id/publish')
  @RequiresPermission('blog.posts', 'WRITE')
  @ApiOperation({ summary: 'Publicar o programar un post.' })
  @ApiOkResponse({ type: PostResponseDto })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishPostDto,
  ): Promise<PostResponseDto> {
    return PostResponseDto.fromDomain(
      await this.publishPost.execute(id, { publishedAt: dto.publishedAt }),
    );
  }

  @Post(':id/archive')
  @RequiresPermission('blog.posts', 'WRITE')
  @ApiOperation({ summary: 'Archivar un post.' })
  @ApiOkResponse({ type: PostResponseDto })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PostResponseDto> {
    return PostResponseDto.fromDomain(await this.archivePost.execute(id));
  }
}
