import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { LeadSourceSchema } from '@core/shared-types';
import {
  ActionContext,
  ActionHandlerPort,
} from '../../../workflows/application/ports/action-handler.port';
import { WorkflowActionHandler } from '../../../workflows/application/ports/workflow-action-handler.decorator';
import { GetFormResponseUseCase } from '../../../dynamic-forms/application/use-cases/get-form-response.use-case';
import { CaptureLeadUseCase } from '../../application/use-cases/capture-lead.use-case';

// Config del step (editable en el editor de workflows vía el JSON-schema que el
// registry expone). Mapea fieldKeys de la respuesta → campos del lead.
const inputSchema = z.object({
  fieldMap: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      company: z.string().optional(),
    })
    .default({}),
  utmKeys: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
    })
    .optional(),
  consentKey: z.string().optional(),
  customFieldKeys: z.array(z.string()).optional(),
  source: LeadSourceSchema.optional(),
});

type CreateFromResponseInput = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  leadId: z.string().nullable(),
  skipped: z.boolean(),
});

interface TriggerPayload {
  formResponseId?: string;
}

/**
 * Action handler `leads.create_from_response`: a partir de un evento
 * `form.response.submitted`, carga la `FormResponse`, aplica el mapeo
 * campo-respuesta → campo-lead y crea el lead vía `CaptureLeadUseCase`
 * (dedupe + atribución por `formResponseId`). Una key inexistente en la
 * respuesta se ignora (con log). Respeta `dryRun`.
 */
@Injectable()
@WorkflowActionHandler()
export class LeadsCreateFromResponseHandler implements ActionHandlerPort<CreateFromResponseInput> {
  readonly key = 'leads.create_from_response';
  readonly inputSchema = inputSchema;
  readonly outputSchema = outputSchema;
  private readonly logger = new Logger('leads.create_from_response');

  constructor(
    private readonly getFormResponse: GetFormResponseUseCase,
    private readonly captureLead: CaptureLeadUseCase,
  ) {}

  async execute(
    ctx: ActionContext,
    input: CreateFromResponseInput,
  ): Promise<z.infer<typeof outputSchema>> {
    const payload = (ctx.triggerEvent?.payload ?? {}) as TriggerPayload;
    const formResponseId = payload.formResponseId;
    if (!formResponseId) {
      this.logger.warn(
        `[run ${ctx.runId}] sin formResponseId en el evento; se omite.`,
      );
      return { leadId: null, skipped: true };
    }

    const response = await this.getFormResponse.execute(formResponseId);
    const answers = (response.answers ?? {}) as Record<string, unknown>;

    const pick = (key?: string): string | undefined => {
      if (!key) return undefined;
      if (!(key in answers) || answers[key] == null || answers[key] === '') {
        this.logger.debug(
          `[run ${ctx.runId}] la respuesta no tiene la key "${key}"; se ignora.`,
        );
        return undefined;
      }
      const v = answers[key];
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      // Valor no primitivo (objeto/array): no se puede mapear a un campo de
      // texto del lead; se ignora.
      return undefined;
    };

    const { fieldMap } = input;
    const customFields =
      input.customFieldKeys && input.customFieldKeys.length > 0
        ? Object.fromEntries(
            input.customFieldKeys
              .filter((k) => k in answers)
              .map((k) => [k, answers[k]]),
          )
        : undefined;

    const consentGiven = input.consentKey
      ? Boolean(answers[input.consentKey])
      : false;

    if (ctx.dryRun) {
      return { leadId: null, skipped: false };
    }

    const lead = await this.captureLead.execute({
      email: pick(fieldMap.email) ?? null,
      phone: pick(fieldMap.phone) ?? null,
      firstName: pick(fieldMap.firstName) ?? null,
      lastName: pick(fieldMap.lastName) ?? null,
      company: pick(fieldMap.company) ?? null,
      source: input.source ?? 'WEB_FORM',
      formResponseId,
      utmSource: pick(input.utmKeys?.source) ?? null,
      utmMedium: pick(input.utmKeys?.medium) ?? null,
      utmCampaign: pick(input.utmKeys?.campaign) ?? null,
      customFields: customFields ?? null,
      consentGiven,
      createdById: response.submittedById,
    });

    return { leadId: lead.id, skipped: false };
  }
}
