import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ActionContext,
  ActionHandlerPort,
} from '../../../workflows/application/ports/action-handler.port';
import { WorkflowActionHandler } from '../../../workflows/application/ports/workflow-action-handler.decorator';
import { CreateUserNotificationUseCase } from '../../application/use-cases/create-user-notification.use-case';

// Config del step. El motor renderiza estos campos contra el scope del run
// ANTES de llamar aquí, así que en el DSL suelen llevar `{{ ... }}`. Lo típico:
//   userId: "{{ target.data.id }}"   (fan-out sobre el target `users`)
const inputSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  kind: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

type NotifyInput = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  created: z.boolean(),
  notificationId: z.string().nullable(),
});

/**
 * Action handler `notify.inApp`: escribe una notificación en el inbox in-app del
 * usuario destino. Respeta `dryRun` (valida el input pero no persiste).
 */
@Injectable()
@WorkflowActionHandler()
export class NotifyInAppHandler implements ActionHandlerPort<NotifyInput> {
  readonly key = 'notify.inApp';
  readonly inputSchema = inputSchema;
  readonly outputSchema = outputSchema;

  constructor(
    private readonly createNotification: CreateUserNotificationUseCase,
  ) {}

  async execute(
    ctx: ActionContext,
    input: NotifyInput,
  ): Promise<z.infer<typeof outputSchema>> {
    if (ctx.dryRun) {
      return { created: false, notificationId: null };
    }
    const notification = await this.createNotification.execute({
      userId: input.userId,
      title: input.title,
      body: input.body ?? null,
      kind: input.kind ?? 'workflow',
      data: input.data ?? null,
    });
    return { created: true, notificationId: notification.id };
  }
}
