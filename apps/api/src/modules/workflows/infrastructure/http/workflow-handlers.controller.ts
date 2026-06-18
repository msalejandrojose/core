import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import {
  ACTION_HANDLER_REGISTRY,
  type ActionHandlerRegistryPort,
  type RegisteredHandlerInfo,
} from '../../application/ports/action-handler-registry.port';

@ApiTags('Workflows')
@Controller('workflows/handlers')
export class WorkflowHandlersController {
  constructor(
    @Inject(ACTION_HANDLER_REGISTRY)
    private readonly registry: ActionHandlerRegistryPort,
  ) {}

  @Get()
  @RequiresPermission('workflows', 'READ')
  @ApiOperation({
    summary: 'Listar action keys registradas + su inputSchema (JSON Schema).',
  })
  @ApiOkResponse({
    schema: { type: 'array', items: { type: 'object' } },
  })
  list(): RegisteredHandlerInfo[] {
    return this.registry.list();
  }
}
