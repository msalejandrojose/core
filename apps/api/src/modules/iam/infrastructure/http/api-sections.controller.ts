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
import { CreateApiSectionUseCase } from '../../application/use-cases/create-api-section.use-case';
import { DeleteApiSectionUseCase } from '../../application/use-cases/delete-api-section.use-case';
import { GetApiSectionUseCase } from '../../application/use-cases/get-api-section.use-case';
import { ListApiSectionsUseCase } from '../../application/use-cases/list-api-sections.use-case';
import { UpdateApiSectionUseCase } from '../../application/use-cases/update-api-section.use-case';
import { RequiresPermission } from './decorators/requires-permission.decorator';
import { ApiSectionResponseDto } from './dto/api-section-response.dto';
import { CreateApiSectionDto } from './dto/create-api-section.dto';
import { ListApiSectionsQueryDto } from './dto/list-api-sections-query.dto';
import { UpdateApiSectionDto } from './dto/update-api-section.dto';

@ApiTags('api-sections')
@Controller('api-sections')
export class ApiSectionsController {
  constructor(
    private readonly listSections: ListApiSectionsUseCase,
    private readonly getSection: GetApiSectionUseCase,
    private readonly createSection: CreateApiSectionUseCase,
    private readonly updateSection: UpdateApiSectionUseCase,
    private readonly deleteSection: DeleteApiSectionUseCase,
  ) {}

  @Get()
  @RequiresPermission('iam.api_sections', 'READ')
  @ApiOperation({ summary: 'Listar secciones (paginado).' })
  @ApiPaginatedResponse(ApiSectionResponseDto)
  async list(
    @Query() query: ListApiSectionsQueryDto,
  ): Promise<PaginatedResponseDto<ApiSectionResponseDto>> {
    const { items, total } = await this.listSections.execute({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      parentSectionId: query.parentSectionId,
      codeContains: query.codeContains,
    });
    return PaginatedResponseDto.of(
      items.map(ApiSectionResponseDto.fromApiSection),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('iam.api_sections', 'READ')
  @ApiOperation({ summary: 'Obtener una sección por id.' })
  @ApiOkResponse({ type: ApiSectionResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiSectionResponseDto> {
    return ApiSectionResponseDto.fromApiSection(
      await this.getSection.execute(id),
    );
  }

  @Post()
  @RequiresPermission('iam.api_sections', 'WRITE')
  @ApiOperation({ summary: 'Crear una sección.' })
  @ApiCreatedResponse({ type: ApiSectionResponseDto })
  async create(
    @Body() dto: CreateApiSectionDto,
  ): Promise<ApiSectionResponseDto> {
    const s = await this.createSection.execute({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      parentSectionId: dto.parentSectionId ?? null,
    });
    return ApiSectionResponseDto.fromApiSection(s);
  }

  @Patch(':id')
  @RequiresPermission('iam.api_sections', 'WRITE')
  @ApiOperation({ summary: 'Actualizar parcialmente una sección.' })
  @ApiOkResponse({ type: ApiSectionResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiSectionDto,
  ): Promise<ApiSectionResponseDto> {
    const s = await this.updateSection.execute(id, dto);
    return ApiSectionResponseDto.fromApiSection(s);
  }

  @Delete(':id')
  @RequiresPermission('iam.api_sections', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una sección (falla si está en uso).' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteSection.execute(id);
  }
}
