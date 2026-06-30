import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { FormInstance, FormResponsePolicy } from '../../domain/entities/form-instance.entity';
import { FormNotFoundError } from '../../domain/errors/form-not-found.error';
import { FORM_REPOSITORY, type FormRepositoryPort } from '../ports/form-repository.port';
import { FORM_INSTANCE_REPOSITORY, type FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';

export interface CreateFormInstanceInput {
  formId: string;
  responsePolicy?: FormResponsePolicy;
  requiresAuth?: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  maxResponses?: number | null;
  createdById?: string | null;
}

@Injectable()
export class CreateFormInstanceUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
  ) {}

  async execute(input: CreateFormInstanceInput): Promise<FormInstance> {
    const form = await this.forms.findById(input.formId);
    if (!form) throw new FormNotFoundError(input.formId);

    const hash = randomBytes(24).toString('base64url');

    return this.instances.create({
      formId: input.formId,
      hash,
      responsePolicy: input.responsePolicy ?? 'UNLIMITED',
      requiresAuth: input.requiresAuth ?? false,
      opensAt: input.opensAt ?? null,
      closesAt: input.closesAt ?? null,
      maxResponses: input.maxResponses ?? null,
      createdById: input.createdById ?? null,
    });
  }
}
