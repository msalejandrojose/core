import { Inject, Injectable, Logger } from '@nestjs/common';
import { RegisterEventUseCase } from '../../../workflows/application/use-cases/register-event.use-case';
import { FormResponse } from '../../domain/entities/form-response.entity';
import { FormInstanceClosedError } from '../../domain/errors/form-instance-closed.error';
import { FormInstanceNotFoundError } from '../../domain/errors/form-instance-not-found.error';
import { FormResponseDuplicateError } from '../../domain/errors/form-response-duplicate.error';
import { FormResponseLimitReachedError } from '../../domain/errors/form-response-limit-reached.error';
import {
  FORM_INSTANCE_REPOSITORY,
  type FormInstanceRepositoryPort,
} from '../ports/form-instance-repository.port';
import {
  FORM_REPOSITORY,
  type FormRepositoryPort,
} from '../ports/form-repository.port';
import {
  FORM_RESPONSE_REPOSITORY,
  type FormResponseRepositoryPort,
} from '../ports/form-response-repository.port';

export interface SubmitFormResponseInput {
  hash: string;
  answers: unknown;
  submittedById?: string | null;
  submittedByFingerprint?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class SubmitFormResponseUseCase {
  private readonly logger = new Logger(SubmitFormResponseUseCase.name);

  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY)
    private readonly instances: FormInstanceRepositoryPort,
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
    @Inject(FORM_RESPONSE_REPOSITORY)
    private readonly responses: FormResponseRepositoryPort,
    private readonly registerEvent: RegisterEventUseCase,
  ) {}

  async execute(input: SubmitFormResponseInput): Promise<FormResponse> {
    const instance = await this.instances.findByHash(input.hash);
    if (!instance) throw new FormInstanceNotFoundError(input.hash);

    const now = new Date();
    const isClosed =
      instance.status === 'CLOSED' ||
      (instance.opensAt !== null && now < instance.opensAt) ||
      (instance.closesAt !== null && now > instance.closesAt);

    if (isClosed) throw new FormInstanceClosedError(input.hash);

    // Verificar cap global
    if (instance.maxResponses !== null) {
      const count = await this.instances.countResponses(instance.id);
      if (count >= instance.maxResponses)
        throw new FormResponseLimitReachedError();
    }

    // Verificar política de unicidad
    if (instance.responsePolicy === 'SINGLE_PER_LINK') {
      const exists = await this.responses.existsByInstance(instance.id);
      if (exists) throw new FormResponseDuplicateError();
    } else if (instance.responsePolicy === 'SINGLE_PER_USER') {
      if (input.submittedById) {
        const exists = await this.responses.existsByUserId(
          instance.id,
          input.submittedById,
        );
        if (exists) throw new FormResponseDuplicateError();
      } else if (input.submittedByFingerprint) {
        const exists = await this.responses.existsByFingerprint(
          instance.id,
          input.submittedByFingerprint,
        );
        if (exists) throw new FormResponseDuplicateError();
      }
    }

    // Obtener schema actual para snapshot
    const form = await this.forms.findById(instance.formId);

    const response = await this.responses.create({
      formInstanceId: instance.id,
      submittedById: input.submittedById ?? null,
      submittedByFingerprint: input.submittedByFingerprint ?? null,
      answers: input.answers,

      schemaSnapshot: form!.schema,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    // Publica el hecho hacia el motor de workflows (post-persist, tolerante a
    // fallos: un error del bus no debe romper el envío). El payload NO incluye
    // `answers`: los consumidores cargan la FormResponse por `formResponseId`.
    try {
      await this.registerEvent.execute({
        type: 'form.response.submitted',
        payload: {
          formResponseId: response.id,
          formInstanceId: instance.id,
          formInstanceHash: instance.hash,
          formId: instance.formId,
          submittedById: response.submittedById,
        },
        sourceUserId: response.submittedById,
        correlationId: response.id,
        idempotencyKey: `form.response.submitted:${response.id}`,
      });
    } catch (err) {
      this.logger.error(
        `No se pudo publicar form.response.submitted para ${response.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return response;
  }
}
