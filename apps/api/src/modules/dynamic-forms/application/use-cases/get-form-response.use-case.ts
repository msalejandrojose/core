import { Inject, Injectable } from '@nestjs/common';
import { FormResponse } from '../../domain/entities/form-response.entity';
import { FormResponseNotFoundError } from '../../domain/errors/form-response-not-found.error';
import { FORM_RESPONSE_REPOSITORY, type FormResponseRepositoryPort } from '../ports/form-response-repository.port';

@Injectable()
export class GetFormResponseUseCase {
  constructor(
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  async execute(id: string): Promise<FormResponse> {
    const response = await this.responses.findById(id);
    if (!response) throw new FormResponseNotFoundError(id);
    return response;
  }
}
