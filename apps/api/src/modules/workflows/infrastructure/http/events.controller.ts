import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { RegisterEventUseCase } from '../../application/use-cases/register-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case';
import { RegisterEventDto } from './dto/register-event.dto';
import { ListEventsQueryDto } from './dto/list-events.query.dto';
import { WorkflowEventResponseDto } from './dto/workflow-event.response.dto';

@ApiTags('Workflows')
@Controller('workflows/events')
export class EventsController {
  constructor(
    private readonly registerEvent: RegisterEventUseCase,
    private readonly listEvents: ListEventsUseCase,
  ) {}

  @Post()
  @RequiresPermission('workflows', 'WRITE')
  @ApiOperation({
    summary: 'Registrar un evento (auditoría/replay; dispara workflows).',
  })
  @ApiCreatedResponse({ type: WorkflowEventResponseDto })
  async register(
    @Body() dto: RegisterEventDto,
  ): Promise<WorkflowEventResponseDto> {
    const event = await this.registerEvent.execute({
      type: dto.type,
      payload: dto.payload,
      sourceUserId: dto.sourceUserId ?? null,
      correlationId: dto.correlationId ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
    });
    return WorkflowEventResponseDto.fromDomain(event);
  }

  @Get('types')
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Lista de tipos de evento vistos.' })
  @ApiOkResponse({ type: [String] })
  types(): Promise<string[]> {
    return this.listEvents.distinctTypes();
  }

  @Get()
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({ summary: 'Listar eventos (offset paginado).' })
  @ApiPaginatedResponse(WorkflowEventResponseDto)
  async list(
    @Query() query: ListEventsQueryDto,
  ): Promise<PaginatedResponseDto<WorkflowEventResponseDto>> {
    const { items, total } = await this.listEvents.list({
      type: query.type,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedResponseDto.of(
      items.map((e) => WorkflowEventResponseDto.fromDomain(e)),
      total,
      query.page,
      query.limit,
    );
  }
}
