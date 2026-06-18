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
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CreateTagUseCase } from '../../application/use-cases/create-tag.use-case';
import { UpdateTagUseCase } from '../../application/use-cases/update-tag.use-case';
import { DeleteTagUseCase } from '../../application/use-cases/delete-tag.use-case';
import { ListTagsUseCase } from '../../application/use-cases/list-tags.use-case';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ListTagsQueryDto } from './dto/list-tags.query.dto';
import { TagResponseDto } from './dto/tag.response.dto';

@ApiTags('blog')
@Controller('blog/tags')
export class TagsController {
  constructor(
    private readonly listTags: ListTagsUseCase,
    private readonly createTag: CreateTagUseCase,
    private readonly updateTag: UpdateTagUseCase,
    private readonly deleteTag: DeleteTagUseCase,
  ) {}

  @Get()
  @RequiresPermission('blog.tags', 'READ')
  @ApiOperation({ summary: 'Listar etiquetas (offset paginado).' })
  @ApiPaginatedResponse(TagResponseDto)
  async list(
    @Query() query: ListTagsQueryDto,
  ): Promise<PaginatedResponseDto<TagResponseDto>> {
    const { items, total } = await this.listTags.execute({
      page: query.page,
      limit: query.limit,
      nameContains: query.nameContains,
    });
    return PaginatedResponseDto.of(
      items.map((t) => TagResponseDto.fromDomain(t)),
      total,
      query.page,
      query.limit,
    );
  }

  @Post()
  @RequiresPermission('blog.tags', 'WRITE')
  @ApiOperation({ summary: 'Crear una etiqueta.' })
  @ApiCreatedResponse({ type: TagResponseDto })
  async create(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    return TagResponseDto.fromDomain(
      await this.createTag.execute({ name: dto.name, slug: dto.slug }),
    );
  }

  @Patch(':id')
  @RequiresPermission('blog.tags', 'WRITE')
  @ApiOperation({ summary: 'Editar una etiqueta.' })
  @ApiOkResponse({ type: TagResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return TagResponseDto.fromDomain(await this.updateTag.execute(id, dto));
  }

  @Delete(':id')
  @RequiresPermission('blog.tags', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una etiqueta.' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteTag.execute(id);
  }
}
