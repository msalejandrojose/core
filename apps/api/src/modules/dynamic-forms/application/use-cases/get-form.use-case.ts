import { Inject, Injectable } from '@nestjs/common';
import { Form } from '../../domain/entities/form.entity';
import { FormNotFoundError } from '../../domain/errors/form-not-found.error';
import { FORM_REPOSITORY, FormRepositoryPort } from '../ports/form-repository.port';

@Injectable()
export class GetFormUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
  ) {}

  async execute(id: string): Promise<Form> {
    const form = await this.forms.findById(id);
    if (!form) throw new FormNotFoundError(id);
    return form;
  }
}
