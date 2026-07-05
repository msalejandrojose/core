import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ActionContext,
  ActionHandlerPort,
} from '../../application/ports/action-handler.port';
import { WorkflowActionHandler } from '../../application/ports/workflow-action-handler.decorator';

const inputSchema = z.object({
  message: z.string(),
  level: z.enum(['log', 'warn', 'error']).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

type LogInput = z.infer<typeof inputSchema>;

// Handler built-in `log`: útil para tests/debug de workflows. No tiene
// side-effects externos, así que es seguro también en dry-run.
@Injectable()
@WorkflowActionHandler()
export class LogActionHandler implements ActionHandlerPort<LogInput> {
  readonly key = 'log';
  readonly inputSchema = inputSchema;
  private readonly logger = new Logger('WorkflowLog');

  execute(ctx: ActionContext, input: LogInput): Promise<{ logged: true }> {
    const line = `[run ${ctx.runId}] ${input.message}`;
    const level = input.level ?? 'log';
    if (level === 'error') this.logger.error(line, input.data);
    else if (level === 'warn') this.logger.warn(line);
    else this.logger.log(line);
    return Promise.resolve({ logged: true });
  }
}
