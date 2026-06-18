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
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from '../../application/use-cases/delete-category.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { CategoryResponseDto } from './dto/category.response.dto';

@ApiTags('blog')
@Controller('blog/categories')
export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  @RequiresPermission('blog.categories', 'READ')
  @ApiOperation({ summary: 'Listar categorías (offset paginado).' })
  @ApiPaginatedResponse(CategoryResponseDto)
  async list(
    @Query() query: ListCategoriesQueryDto,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const { items, total } = await this.listCategories.execute({
      page: query.page,
      limit: query.limit,
      nameContains: query.nameContains,
    });
    return PaginatedResponseDto.of(
      items.map((c) => CategoryResponseDto.fromDomain(c)),
      total,
      query.page,
      query.limit,
    );
  }

  @Post()
  @RequiresPermission('blog.categories', 'WRITE')
  @ApiOperation({ summary: 'Crear una categoría.' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.createCategory.execute({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      parentId: dto.parentId ?? null,
    });
    return CategoryResponseDto.fromDomain(category);
  }

  @Patch(':id')
  @RequiresPermission('blog.categories', 'WRITE')
  @ApiOperation({ summary: 'Editar una categoría.' })
  @ApiOkResponse({ type: CategoryResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return CategoryResponseDto.fromDomain(
      await this.updateCategory.execute(id, dto),
    );
  }

  @Delete(':id')
  @RequiresPermission('blog.categories', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Borrar una categoría (los posts quedan sin categoría).',
  })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteCategory.execute(id);
  }
}
