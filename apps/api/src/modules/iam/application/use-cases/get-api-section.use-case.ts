import { Inject, Injectable } from '@nestjs/common';
import { ApiSection } from '../../domain/entities/api-section.entity';
import { ApiSectionNotFoundError } from '../../domain/errors/api-section-not-found.error';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
} from '../ports/api-section-repository.port';

@Injectable()
export class GetApiSectionUseCase {
  constructor(
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
  ) {}

  async execute(id: string): Promise<ApiSection> {
    const section = await this.sections.findById(id);
    if (!section) throw new ApiSectionNotFoundError(id);
    return section;
  }
}
