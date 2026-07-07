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
import { CreatePostalCodeUseCase } from '../../application/use-cases/create-postal-code.use-case';
import { DeletePostalCodeUseCase } from '../../application/use-cases/delete-postal-code.use-case';
import { GetPostalCodeUseCase } from '../../application/use-cases/get-postal-code.use-case';
import { ListPostalCodesUseCase } from '../../application/use-cases/list-postal-codes.use-case';
import { UpdatePostalCodeUseCase } from '../../application/use-cases/update-postal-code.use-case';
import { CreatePostalCodeDto } from './dto/create-postal-code.dto';
import { ListPostalCodesQueryDto } from './dto/list-postal-codes.query.dto';
import { PostalCodeResponseDto } from './dto/postal-code.response.dto';
import { UpdatePostalCodeDto } from './dto/update-postal-code.dto';

@ApiTags('geo')
@Controller('geo/postal-codes')
export class PostalCodesController {
  constructor(
    private readonly listPostalCodes: ListPostalCodesUseCase,
    private readonly getPostalCode: GetPostalCodeUseCase,
    private readonly createPostalCode: CreatePostalCodeUseCase,
    private readonly updatePostalCode: UpdatePostalCodeUseCase,
    private readonly deletePostalCode: DeletePostalCodeUseCase,
  ) {}

  @Get()
  @RequiresPermission('geo.postal_codes', 'READ')
  @ApiOperation({ summary: 'Listar códigos postales (offset paginado).' })
  @ApiPaginatedResponse(PostalCodeResponseDto)
  async list(
    @Query() query: ListPostalCodesQueryDto,
  ): Promise<PaginatedResponseDto<PostalCodeResponseDto>> {
    const { items, total } = await this.listPostalCodes.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      municipalityId: query.municipalityId,
    });
    return PaginatedResponseDto.of(
      items.map((e) => PostalCodeResponseDto.fromDomain(e)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('geo.postal_codes', 'READ')
  @ApiOperation({ summary: 'Obtener un código postal.' })
  @ApiOkResponse({ type: PostalCodeResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PostalCodeResponseDto> {
    return PostalCodeResponseDto.fromDomain(
      await this.getPostalCode.execute(id),
    );
  }

  @Post()
  @RequiresPermission('geo.postal_codes', 'WRITE')
  @ApiOperation({ summary: 'Crear un código postal.' })
  @ApiCreatedResponse({ type: PostalCodeResponseDto })
  async create(
    @Body() dto: CreatePostalCodeDto,
  ): Promise<PostalCodeResponseDto> {
    return PostalCodeResponseDto.fromDomain(
      await this.createPostalCode.execute(dto),
    );
  }

  @Patch(':id')
  @RequiresPermission('geo.postal_codes', 'WRITE')
  @ApiOperation({ summary: 'Editar un código postal.' })
  @ApiOkResponse({ type: PostalCodeResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostalCodeDto,
  ): Promise<PostalCodeResponseDto> {
    return PostalCodeResponseDto.fromDomain(
      await this.updatePostalCode.execute(id, dto),
    );
  }

  @Delete(':id')
  @RequiresPermission('geo.postal_codes', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un código postal.' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deletePostalCode.execute(id);
  }
}
