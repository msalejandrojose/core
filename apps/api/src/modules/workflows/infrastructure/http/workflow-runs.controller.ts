import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { GetWorkflowRunUseCase } from '../../application/use-cases/get-workflow-run.use-case';
import { ListWorkflowRunsUseCase } from '../../application/use-cases/list-workflow-runs.use-case';
import { CancelWorkflowRunUseCase } from '../../application/use-cases/cancel-workflow-run.use-case';
import { ListRunsQueryDto } from './dto/list-runs.query.dto';
import {
  WorkflowRunDetailResponseDto,
  WorkflowRunResponseDto,
} from './dto/workflow-run.response.dto';

@ApiTags('Workflows')
@Controller('workflows/runs')
export class WorkflowRunsController {
  constructor(
    private readonly listRuns: ListWorkflowRunsUseCase,
    private readonly getRun: GetWorkflowRunUseCase,
    private readonly cancelRun: CancelWorkflowRunUseCase,
  ) {}

  @Get()
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Listar runs (offset paginado).' })
  @ApiPaginatedResponse(WorkflowRunResponseDto)
  async list(
    @Query() query: ListRunsQueryDto,
  ): Promise<PaginatedResponseDto<WorkflowRunResponseDto>> {
    const { items, total } = await this.listRuns.list({
      status: query.status,
      definitionId: query.definitionId,
      from: query.from,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedResponseDto.of(
      items.map((r) => WorkflowRunResponseDto.fromDomain(r)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Detalle de un run (steps + pending actions).' })
  @ApiOkResponse({ type: WorkflowRunDetailResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowRunDetailResponseDto> {
    return WorkflowRunDetailResponseDto.fromDomain(
      await this.getRun.execute(id),
    );
  }

  @Post(':id/cancel')
  @RequiresPermission('workflows', 'WRITE')
  @ApiOperation({ summary: 'Cancelar un run en curso.' })
  @ApiOkResponse({ type: WorkflowRunResponseDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowRunResponseDto> {
    return WorkflowRunResponseDto.fromDomain(await this.cancelRun.execute(id));
  }
}
