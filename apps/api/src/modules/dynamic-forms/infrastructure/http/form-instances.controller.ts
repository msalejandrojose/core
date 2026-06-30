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
import { CreateFormInstanceUseCase } from '../../application/use-cases/create-form-instance.use-case';
import { DeleteFormInstanceUseCase } from '../../application/use-cases/delete-form-instance.use-case';
import { ListFormInstancesUseCase } from '../../application/use-cases/list-form-instances.use-case';
import { UpdateFormInstanceUseCase } from '../../application/use-cases/update-form-instance.use-case';
import { CreateFormInstanceDto } from './dto/create-form-instance.dto';
import { FormInstanceResponseDto } from './dto/form-instance.response.dto';
import { ListFormInstancesQueryDto } from './dto/list-form-instances.query.dto';
import { UpdateFormInstanceDto } from './dto/update-form-instance.dto';

@ApiTags('dynamic-forms')
@Controller('forms/:formId/instances')
export class FormInstancesController {
  constructor(
    private readonly createInstance: CreateFormInstanceUseCase,
    private readonly listInstances: ListFormInstancesUseCase,
    private readonly updateInstance: UpdateFormInstanceUseCase,
    private readonly deleteInstance: DeleteFormInstanceUseCase,
  ) {}

  @Get()
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Listar instancias de un formulario' })
  @ApiCursorPaginatedResponse(FormInstanceResponseDto)
  async list(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query() query: ListFormInstancesQueryDto,
  ): Promise<CursorPaginatedResponseDto<FormInstanceResponseDto>> {
    const page = await this.listInstances.execute({
      formId,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((i) => FormInstanceResponseDto.fromDomain(i)),
      page.nextCursor,
      query.limit ?? 20,
    );
  }

  @Post()
  @RequiresPermission('forms', 'WRITE')
  @ApiOperation({ summary: 'Crear instancia (link público) de un formulario' })
  @ApiCreatedResponse({ type: FormInstanceResponseDto })
  async create(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: CreateFormInstanceDto,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<FormInstanceResponseDto> {
    const instance = await this.createInstance.execute({
      formId,
      responsePolicy: dto.responsePolicy,
      requiresAuth: dto.requiresAuth,
      opensAt: dto.opensAt ?? null,
      closesAt: dto.closesAt ?? null,
      maxResponses: dto.maxResponses ?? null,
      createdById: user?.sub ?? null,
    });
    return FormInstanceResponseDto.fromDomain(instance);
  }

  @Patch(':instanceId')
  @RequiresPermission('forms', 'WRITE')
  @ApiOperation({ summary: 'Actualizar instancia' })
  @ApiOkResponse({ type: FormInstanceResponseDto })
  async update(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @Body() dto: UpdateFormInstanceDto,
  ): Promise<FormInstanceResponseDto> {
    const instance = await this.updateInstance.execute({
      id: instanceId,
      responsePolicy: dto.responsePolicy,
      requiresAuth: dto.requiresAuth,
      opensAt: dto.opensAt,
      closesAt: dto.closesAt,
      maxResponses: dto.maxResponses,
      status: dto.status,
    });
    return FormInstanceResponseDto.fromDomain(instance);
  }

  @Delete(':instanceId')
  @RequiresPermission('forms', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar instancia' })
  @ApiNoContentResponse()
  async remove(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
  ): Promise<void> {
    await this.deleteInstance.execute(instanceId);
  }
}
