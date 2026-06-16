import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ApiSection } from '../../domain/entities/api-section.entity';
import { ApiSectionAlreadyExistsError } from '../../domain/errors/api-section-already-exists.error';
import { ApiSectionNotFoundError } from '../../domain/errors/api-section-not-found.error';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
} from '../ports/api-section-repository.port';

export interface CreateApiSectionInput {
  code: string;
  name: string;
  description?: string | null;
  parentSectionId?: string | null;
}

@Injectable()
export class CreateApiSectionUseCase {
  constructor(
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
  ) {}

  async execute(input: CreateApiSectionInput): Promise<ApiSection> {
    if (await this.sections.findByCode(input.code)) {
      throw new ApiSectionAlreadyExistsError(input.code);
    }
    if (input.parentSectionId) {
      const parent = await this.sections.findById(input.parentSectionId);
      if (!parent) throw new ApiSectionNotFoundError(input.parentSectionId);
    }

    const now = new Date();
    const section = new ApiSection(
      randomUUID(),
      input.code,
      input.name,
      input.description ?? null,
      input.parentSectionId ?? null,
      now,
      now,
    );
    return this.sections.create(section);
  }
}
