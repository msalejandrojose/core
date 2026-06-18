import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { PublishWorkflowDefinitionUseCase } from '../../application/use-cases/publish-workflow-definition.use-case';
import { ActivateWorkflowDefinitionUseCase } from '../../application/use-cases/activate-workflow-definition.use-case';
import { ListWorkflowDefinitionsUseCase } from '../../application/use-cases/list-workflow-definitions.use-case';
import { TriggerManualRunUseCase } from '../../application/use-cases/trigger-manual-run.use-case';
import { WorkflowDefinitionResponseDto } from './dto/workflow-definition.response.dto';
import { WorkflowRunResponseDto } from './dto/workflow-run.response.dto';

@ApiTags('Workflows')
@Controller('workflows/definitions')
export class WorkflowsController {
  constructor(
    private readonly publish: PublishWorkflowDefinitionUseCase,
    private readonly activate: ActivateWorkflowDefinitionUseCase,
    private readonly listDefs: ListWorkflowDefinitionsUseCase,
    private readonly manualRun: TriggerManualRunUseCase,
  ) {}

  @Post()
  @RequiresPermission('workflows', 'WRITE')
  @ApiOperation({
    summary: 'Publicar una nueva versión de workflow (DSL JSON).',
  })
  @ApiBody({
    schema: { type: 'object' },
    description: 'DSL del workflow (spec §4).',
  })
  @ApiCreatedResponse({ type: WorkflowDefinitionResponseDto })
  async publishDefinition(
    @Body() body: unknown,
  ): Promise<WorkflowDefinitionResponseDto> {
    const def = await this.publish.execute(body);
    return WorkflowDefinitionResponseDto.fromDomain(def);
  }

  @Get()
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Listar definiciones (offset paginado).' })
  @ApiPaginatedResponse(WorkflowDefinitionResponseDto)
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WorkflowDefinitionResponseDto>> {
    const { items, total } = await this.listDefs.list({
      page: query.page,
      limit: query.limit,
    });
    return PaginatedResponseDto.of(
      items.map((d) => WorkflowDefinitionResponseDto.fromDomain(d)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':key')
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Detalle de la versión activa de una key.' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async getActive(
    @Param('key') key: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return WorkflowDefinitionResponseDto.fromDomain(
      await this.listDefs.getActiveByKey(key),
    );
  }

  @Get(':key/versions')
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Histórico de versiones de una key.' })
  @ApiOkResponse({ type: [WorkflowDefinitionResponseDto] })
  async versions(
    @Param('key') key: string,
  ): Promise<WorkflowDefinitionResponseDto[]> {
    const versions = await this.listDefs.listVersions(key);
    return versions.map((d) => WorkflowDefinitionResponseDto.fromDomain(d));
  }

  @Post(':key/versions/:version/activate')
  @RequiresPermission('workflows', 'WRITE')
  @ApiOperation({ summary: 'Activar una versión (desactiva las demás).' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async activateVersion(
    @Param('key') key: string,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<WorkflowDefinitionResponseDto> {
    return WorkflowDefinitionResponseDto.fromDomain(
      await this.activate.execute(key, version),
    );
  }

  @Post(':key/run')
  @RequiresPermission('workflows', 'WRITE')
  @ApiOperation({ summary: 'Disparo manual de la versión activa.' })
  @ApiBody({
    schema: { type: 'object' },
    description: 'Payload del evento sintético.',
  })
  @ApiCreatedResponse({ type: WorkflowRunResponseDto })
  async run(
    @Param('key') key: string,
    @Body() body: unknown,
  ): Promise<WorkflowRunResponseDto> {
    const run = await this.manualRun.execute(key, body ?? {});
    return WorkflowRunResponseDto.fromDomain(run);
  }
}
