import { Inject, Injectable } from '@nestjs/common';
import { Section } from '../../domain/entities/section.entity';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

@Injectable()
export class GetSectionUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(id: string): Promise<Section> {
    const section = await this.sections.findById(id);
    if (!section) throw new SectionNotFoundError(id);
    return section;
  }
}
