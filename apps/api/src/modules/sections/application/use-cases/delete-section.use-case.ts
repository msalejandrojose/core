import { Inject, Injectable } from '@nestjs/common';
import { SectionInUseError } from '../../domain/errors/section-in-use.error';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

@Injectable()
export class DeleteSectionUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const section = await this.sections.findById(id);
    if (!section) throw new SectionNotFoundError(id);
    if (await this.sections.hasActiveChildren(id)) throw new SectionInUseError(id);
    await this.sections.softDelete(id);
  }
}
