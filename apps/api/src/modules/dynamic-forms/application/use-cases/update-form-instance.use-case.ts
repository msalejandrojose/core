import { Inject, Injectable } from '@nestjs/common';
import { FormInstance, FormInstanceStatus, FormResponsePolicy } from '../../domain/entities/form-instance.entity';
import { FormInstanceNotFoundError } from '../../domain/errors/form-instance-not-found.error';
import { FORM_INSTANCE_REPOSITORY, FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';

export interface UpdateFormInstanceInput {
  id: string;
  responsePolicy?: FormResponsePolicy;
  requiresAuth?: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  maxResponses?: number | null;
  status?: FormInstanceStatus;
}

@Injectable()
export class UpdateFormInstanceUseCase {
  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
  ) {}

  async execute(input: UpdateFormInstanceInput): Promise<FormInstance> {
    const instance = await this.instances.findById(input.id);
    if (!instance) throw new FormInstanceNotFoundError(input.id);

    return this.instances.update(input.id, {
      responsePolicy: input.responsePolicy,
      requiresAuth: input.requiresAuth,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      maxResponses: input.maxResponses,
      status: input.status,
    });
  }
}
