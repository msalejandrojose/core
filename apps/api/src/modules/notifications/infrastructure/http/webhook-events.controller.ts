import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { GetWebhookEventUseCase } from '../../application/use-cases/get-webhook-event.use-case';
import { ListWebhookEventsUseCase } from '../../application/use-cases/list-webhook-events.use-case';
import { ReprocessWebhookEventUseCase } from '../../application/use-cases/reprocess-webhook-event.use-case';
import { ListWebhookEventsQueryDto } from './dto/list-webhook-events.query.dto';
import { WebhookEventResponseDto } from './dto/webhook-event.response.dto';

// Centro de webhooks entrantes: inspección del payload crudo recibido por
// cualquier fuente (SendGrid hoy) y reproceso manual de eventos fallidos.
@ApiTags('notifications')
@Controller('webhook-events')
export class WebhookEventsController {
  constructor(
    private readonly listWebhookEvents: ListWebhookEventsUseCase,
    private readonly getWebhookEvent: GetWebhookEventUseCase,
    private readonly reprocessWebhookEvent: ReprocessWebhookEventUseCase,
  ) {}

  @Get()
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Listar eventos entrantes por webhook' })
  @ApiCursorPaginatedResponse(WebhookEventResponseDto)
  async list(
    @Query() query: ListWebhookEventsQueryDto,
  ): Promise<CursorPaginatedResponseDto<WebhookEventResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listWebhookEvents.execute({
      limit,
      cursor: query.cursor,
      source: query.source,
      status: query.status,
      createdFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      createdTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((e) => WebhookEventResponseDto.fromDomain(e)),
      page.nextCursor,
      limit,
    );
  }

  @Get(':id')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({
    summary: 'Obtener un evento de webhook por id (payload incluido)',
  })
  @ApiOkResponse({ type: WebhookEventResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WebhookEventResponseDto> {
    return WebhookEventResponseDto.fromDomain(
      await this.getWebhookEvent.execute(id),
    );
  }

  @Post(':id/reprocess')
  @RequiresPermission('notifications', 'WRITE')
  @ApiOperation({ summary: 'Reprocesar un evento de webhook' })
  @ApiOkResponse({ type: WebhookEventResponseDto })
  async reprocess(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WebhookEventResponseDto> {
    return WebhookEventResponseDto.fromDomain(
      await this.reprocessWebhookEvent.execute(id),
    );
  }
}
