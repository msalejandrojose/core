import { Inject, Injectable } from '@nestjs/common';
import { FormResponse } from '../../domain/entities/form-response.entity';
import { FormInstanceClosedError } from '../../domain/errors/form-instance-closed.error';
import { FormInstanceNotFoundError } from '../../domain/errors/form-instance-not-found.error';
import { FormResponseDuplicateError } from '../../domain/errors/form-response-duplicate.error';
import { FormResponseLimitReachedError } from '../../domain/errors/form-response-limit-reached.error';
import { FORM_INSTANCE_REPOSITORY, type FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';
import { FORM_REPOSITORY, type FormRepositoryPort } from '../ports/form-repository.port';
import { FORM_RESPONSE_REPOSITORY, type FormResponseRepositoryPort } from '../ports/form-response-repository.port';

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
  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
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
      if (count >= instance.maxResponses) throw new FormResponseLimitReachedError();
    }

    // Verificar política de unicidad
    if (instance.responsePolicy === 'SINGLE_PER_LINK') {
      const exists = await this.responses.existsByInstance(instance.id);
      if (exists) throw new FormResponseDuplicateError();
    } else if (instance.responsePolicy === 'SINGLE_PER_USER') {
      if (input.submittedById) {
        const exists = await this.responses.existsByUserId(instance.id, input.submittedById);
        if (exists) throw new FormResponseDuplicateError();
      } else if (input.submittedByFingerprint) {
        const exists = await this.responses.existsByFingerprint(instance.id, input.submittedByFingerprint);
        if (exists) throw new FormResponseDuplicateError();
      }
    }

    // Obtener schema actual para snapshot
    const form = await this.forms.findById(instance.formId);

    return this.responses.create({
      formInstanceId: instance.id,
      submittedById: input.submittedById ?? null,
      submittedByFingerprint: input.submittedByFingerprint ?? null,
      answers: input.answers,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      schemaSnapshot: form!.schema,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }
}
