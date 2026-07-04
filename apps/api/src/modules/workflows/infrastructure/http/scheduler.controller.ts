import { Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { WorkflowSchedulerService } from '../scheduler/workflow-scheduler.service';

@ApiTags('Workflows')
@Controller('workflows/scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: WorkflowSchedulerService) {}

  @Post('tick')
  @RequiresPermission('workflows', 'WRITE')
  @ApiOperation({
    summary: 'Fuerza una pasada del scheduler (dispara los cron vencidos).',
  })
  @ApiOkResponse({
    schema: { type: 'object', properties: { fired: { type: 'number' } } },
  })
  async tick(): Promise<{ fired: number }> {
    return { fired: await this.scheduler.tick() };
  }
}
