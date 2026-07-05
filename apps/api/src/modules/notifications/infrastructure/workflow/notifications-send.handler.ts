import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ActionContext,
  ActionHandlerPort,
} from '../../../workflows/application/ports/action-handler.port';
import { WorkflowActionHandler } from '../../../workflows/application/ports/workflow-action-handler.decorator';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';

// Config del step (el motor renderiza `to` y `variables` contra el scope del
// run ANTES de llamar aquí; por eso pueden llevar `{{ ... }}` en el DSL).
const inputSchema = z.object({
  messageTypeKey: z.string().min(1),
  to: z.string().min(1),
  variables: z.record(z.string(), z.unknown()).optional(),
});

type SendInput = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  sent: z.boolean(),
  skipped: z.boolean(),
  channel: z.string(),
  to: z.string(),
});

/**
 * Action handler `notifications.send`: carga el `MessageType` por key (⇒ cuenta
 * ⇒ canal), renderiza el contenido con las variables, valida y lo entrega por
 * el dispatcher del canal. Respeta `dryRun` (renderiza y valida pero no envía).
 */
@Injectable()
@WorkflowActionHandler()
export class NotificationsSendHandler implements ActionHandlerPort<SendInput> {
  readonly key = 'notifications.send';
  readonly inputSchema = inputSchema;
  readonly outputSchema = outputSchema;

  constructor(private readonly sendNotification: SendNotificationUseCase) {}

  async execute(
    ctx: ActionContext,
    input: SendInput,
  ): Promise<z.infer<typeof outputSchema>> {
    const result = await this.sendNotification.executeByKey(
      input.messageTypeKey,
      {
        to: input.to,
        variables: input.variables,
        dryRun: ctx.dryRun,
      },
    );
    return {
      sent: result.sent,
      skipped: result.skipped,
      channel: result.channel,
      to: result.to,
    };
  }
}
