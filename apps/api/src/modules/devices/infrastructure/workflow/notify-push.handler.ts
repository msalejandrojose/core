import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ActionContext,
  ActionHandlerPort,
} from '../../../workflows/application/ports/action-handler.port';
import { WorkflowActionHandler } from '../../../workflows/application/ports/workflow-action-handler.decorator';
import { SendPushToUserUseCase } from '../../application/use-cases/send-push-to-user.use-case';

// Config del step. El motor renderiza estos campos contra el scope del run
// ANTES de llamar aquí, así que en el DSL suelen llevar `{{ ... }}`. Lo típico:
//   userId: "{{ target.data.id }}"   (fan-out sobre el target `users`)
const inputSchema = z.object({
  userId: z.string().min(1),
  messageTypeKey: z.string().min(1),
  variables: z.record(z.string(), z.unknown()).optional(),
});

type NotifyPushInput = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  devices: z.number(),
  sent: z.number(),
  skipped: z.number(),
});

/**
 * Action handler `notify.push`: envía un push al usuario destino resolviendo
 * TODOS sus tokens de dispositivo registrados. Delega el render/validación/envío
 * en `SendPushToUserUseCase` (que reutiliza el dispatcher de FCM). Respeta
 * `dryRun` (renderiza y valida por token pero no despacha).
 */
@Injectable()
@WorkflowActionHandler()
export class NotifyPushHandler implements ActionHandlerPort<NotifyPushInput> {
  readonly key = 'notify.push';
  readonly inputSchema = inputSchema;
  readonly outputSchema = outputSchema;

  constructor(private readonly sendPush: SendPushToUserUseCase) {}

  async execute(
    ctx: ActionContext,
    input: NotifyPushInput,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.sendPush.execute({
      userId: input.userId,
      messageTypeKey: input.messageTypeKey,
      variables: input.variables,
      dryRun: ctx.dryRun,
    });
  }
}
