import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { FormResponse } from '../../domain/entities/form-response.entity';
import { FormInstanceNotFoundError } from '../../domain/errors/form-instance-not-found.error';
import { FORM_INSTANCE_REPOSITORY, type FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';
import { FORM_RESPONSE_REPOSITORY, type FormResponseRepositoryPort } from '../ports/form-response-repository.port';

export interface ListFormResponsesInput {
  formInstanceId: string;
  limit: number;
  cursor?: string;
}

@Injectable()
export class ListFormResponsesUseCase {
  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  async execute(input: ListFormResponsesInput): Promise<CursorPage<FormResponse>> {
    const instance = await this.instances.findById(input.formInstanceId);
    if (!instance) throw new FormInstanceNotFoundError(input.formInstanceId);
    return this.responses.list(input);
  }
}
