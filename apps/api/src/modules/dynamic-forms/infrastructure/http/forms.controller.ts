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
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CreateFormUseCase } from '../../application/use-cases/create-form.use-case';
import { DeleteFormUseCase } from '../../application/use-cases/delete-form.use-case';
import { GetFormUseCase } from '../../application/use-cases/get-form.use-case';
import { ListFormsUseCase } from '../../application/use-cases/list-forms.use-case';
import { UpdateFormUseCase } from '../../application/use-cases/update-form.use-case';
import { CreateFormDto } from './dto/create-form.dto';
import { FormResponseDto } from './dto/form.response.dto';
import { ListFormsQueryDto } from './dto/list-forms.query.dto';
import { UpdateFormDto } from './dto/update-form.dto';

@ApiTags('dynamic-forms')
@Controller('forms')
export class FormsController {
  constructor(
    private readonly createForm: CreateFormUseCase,
    private readonly updateForm: UpdateFormUseCase,
    private readonly deleteForm: DeleteFormUseCase,
    private readonly getForm: GetFormUseCase,
    private readonly listForms: ListFormsUseCase,
  ) {}

  @Get()
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Listar formularios' })
  @ApiCursorPaginatedResponse(FormResponseDto)
  async list(
    @Query() query: ListFormsQueryDto,
  ): Promise<CursorPaginatedResponseDto<FormResponseDto>> {
    const page = await this.listForms.execute({
      limit: query.limit ?? 20,
      cursor: query.cursor,
      status: query.status,
      titleContains: query.titleContains,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((f) => FormResponseDto.fromDomain(f)),
      page.nextCursor,
      query.limit ?? 20,
    );
  }

  @Get(':id')
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Obtener un formulario' })
  @ApiOkResponse({ type: FormResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<FormResponseDto> {
    const form = await this.getForm.execute(id);
    return FormResponseDto.fromDomain(form);
  }

  @Post()
  @RequiresPermission('forms', 'WRITE')
  @ApiOperation({ summary: 'Crear formulario' })
  @ApiCreatedResponse({ type: FormResponseDto })
  async create(
    @Body() dto: CreateFormDto,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<FormResponseDto> {
    const form = await this.createForm.execute({
      title: dto.title,
      description: dto.description ?? null,
      schema: dto.schema,
      createdById: user?.sub ?? null,
    });
    return FormResponseDto.fromDomain(form);
  }

  @Patch(':id')
  @RequiresPermission('forms', 'WRITE')
  @ApiOperation({ summary: 'Actualizar formulario' })
  @ApiOkResponse({ type: FormResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
  ): Promise<FormResponseDto> {
    const form = await this.updateForm.execute({
      id,
      title: dto.title,
      description: dto.description,
      schema: dto.schema,
    });
    return FormResponseDto.fromDomain(form);
  }

  @Delete(':id')
  @RequiresPermission('forms', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar formulario' })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteForm.execute(id);
  }
}
