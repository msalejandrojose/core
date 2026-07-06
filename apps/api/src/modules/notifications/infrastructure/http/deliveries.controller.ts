import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { GetDeliveryUseCase } from '../../application/use-cases/get-delivery.use-case';
import { ListDeliveriesUseCase } from '../../application/use-cases/list-deliveries.use-case';
import { DeliveryResponseDto } from './dto/delivery.response.dto';
import { ListDeliveriesQueryDto } from './dto/list-deliveries.query.dto';

// Lectura del log de entregabilidad (deliveries): estado por envío y su
// histórico de eventos del proveedor. Solo lectura; la escritura la hace el
// flujo de envío y el webhook.
@ApiTags('notifications')
@Controller('deliveries')
export class DeliveriesController {
  constructor(
    private readonly listDeliveries: ListDeliveriesUseCase,
    private readonly getDelivery: GetDeliveryUseCase,
  ) {}

  @Get()
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Listar envíos (log de entregabilidad)' })
  @ApiCursorPaginatedResponse(DeliveryResponseDto)
  async list(
    @Query() query: ListDeliveriesQueryDto,
  ): Promise<CursorPaginatedResponseDto<DeliveryResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listDeliveries.execute({
      limit,
      cursor: query.cursor,
      messageTypeKey: query.messageTypeKey,
      status: query.status,
      toAddress: query.to,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((d) => DeliveryResponseDto.fromDomain(d)),
      page.nextCursor,
      limit,
    );
  }

  @Get(':id')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Obtener un envío por id' })
  @ApiOkResponse({ type: DeliveryResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeliveryResponseDto> {
    return DeliveryResponseDto.fromDomain(await this.getDelivery.execute(id));
  }
}
