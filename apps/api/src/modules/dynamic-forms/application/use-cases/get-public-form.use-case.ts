import { Inject, Injectable } from '@nestjs/common';
import { Form } from '../../domain/entities/form.entity';
import { FormInstance } from '../../domain/entities/form-instance.entity';
import { FormInstanceClosedError } from '../../domain/errors/form-instance-closed.error';
import { FormInstanceNotFoundError } from '../../domain/errors/form-instance-not-found.error';
import { FORM_INSTANCE_REPOSITORY, FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';
import { FORM_REPOSITORY, FormRepositoryPort } from '../ports/form-repository.port';

export interface GetPublicFormResult {
  form: Pick<Form, 'id' | 'title' | 'description' | 'schema'>;
  instance: Pick<FormInstance, 'id' | 'hash' | 'responsePolicy' | 'requiresAuth' | 'opensAt' | 'closesAt' | 'maxResponses' | 'status'>;
}

@Injectable()
export class GetPublicFormUseCase {
  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
  ) {}

  async execute(hash: string): Promise<GetPublicFormResult> {
    const instance = await this.instances.findByHash(hash);
    if (!instance) throw new FormInstanceNotFoundError(hash);

    const now = new Date();
    const isClosed =
      instance.status === 'CLOSED' ||
      (instance.opensAt !== null && now < instance.opensAt) ||
      (instance.closesAt !== null && now > instance.closesAt);

    if (isClosed) throw new FormInstanceClosedError(hash);

    const form = await this.forms.findById(instance.formId);
    // El form siempre existe mientras la instancia exista (CASCADE).
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return {
      form: {
        id: form!.id,
        title: form!.title,
        description: form!.description,
        schema: form!.schema,
      },
      instance: {
        id: instance.id,
        hash: instance.hash,
        responsePolicy: instance.responsePolicy,
        requiresAuth: instance.requiresAuth,
        opensAt: instance.opensAt,
        closesAt: instance.closesAt,
        maxResponses: instance.maxResponses,
        status: instance.status,
      },
    };
  }
}
