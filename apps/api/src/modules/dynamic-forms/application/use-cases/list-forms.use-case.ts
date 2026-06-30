import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Form, FormStatus } from '../../domain/entities/form.entity';
import { FORM_REPOSITORY, type FormRepositoryPort } from '../ports/form-repository.port';

export interface ListFormsInput {
  limit: number;
  cursor?: string;
  status?: FormStatus;
  titleContains?: string;
}

@Injectable()
export class ListFormsUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
  ) {}

  execute(input: ListFormsInput): Promise<CursorPage<Form>> {
    return this.forms.list(input);
  }
}
