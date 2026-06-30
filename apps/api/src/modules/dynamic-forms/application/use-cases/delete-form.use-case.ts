import { Inject, Injectable } from '@nestjs/common';
import { FormNotFoundError } from '../../domain/errors/form-not-found.error';
import { FORM_REPOSITORY, type FormRepositoryPort } from '../ports/form-repository.port';

@Injectable()
export class DeleteFormUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const form = await this.forms.findById(id);
    if (!form) throw new FormNotFoundError(id);
    await this.forms.delete(id);
  }
}
