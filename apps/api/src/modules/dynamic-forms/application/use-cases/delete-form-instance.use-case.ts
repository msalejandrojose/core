import { Inject, Injectable } from '@nestjs/common';
import { FormInstanceNotFoundError } from '../../domain/errors/form-instance-not-found.error';
import { FORM_INSTANCE_REPOSITORY, FormInstanceRepositoryPort } from '../ports/form-instance-repository.port';

@Injectable()
export class DeleteFormInstanceUseCase {
  constructor(
    @Inject(FORM_INSTANCE_REPOSITORY) private readonly instances: FormInstanceRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const instance = await this.instances.findById(id);
    if (!instance) throw new FormInstanceNotFoundError(id);
    await this.instances.delete(id);
  }
}
