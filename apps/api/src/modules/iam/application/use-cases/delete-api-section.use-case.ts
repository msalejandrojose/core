import { Inject, Injectable } from '@nestjs/common';
import { ApiSectionInUseError } from '../../domain/errors/api-section-in-use.error';
import { ApiSectionNotFoundError } from '../../domain/errors/api-section-not-found.error';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
} from '../ports/api-section-repository.port';

@Injectable()
export class DeleteApiSectionUseCase {
  constructor(
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const section = await this.sections.findById(id);
    if (!section) throw new ApiSectionNotFoundError(id);
    if (await this.sections.isInUse(id)) throw new ApiSectionInUseError(id);
    await this.sections.delete(id);
  }
}
