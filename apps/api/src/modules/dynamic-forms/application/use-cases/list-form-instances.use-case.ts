import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { FormInstance } from '../../domain/entities/form-instance.entity';
import { FORM_INSTANCE_REPOSITORY, FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';

export interface ListFormInstancesInput {
  formId: string;
  limit: number;
  cursor?: string;
}

@Injectable()
export class ListFormInstancesUseCase {
  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
  ) {}

  execute(input: ListFormInstancesInput): Promise<CursorPage<FormInstance>> {
    return this.instances.list(input);
  }
}
