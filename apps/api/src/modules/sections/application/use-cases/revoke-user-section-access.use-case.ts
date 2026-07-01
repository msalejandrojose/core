import { Inject, Injectable } from '@nestjs/common';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

@Injectable()
export class RevokeUserSectionAccessUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(sectionId: string, userId: string): Promise<void> {
    const section = await this.sections.findById(sectionId);
    if (!section) throw new SectionNotFoundError(sectionId);
    await this.sections.revokeUserAccess(sectionId, userId);
  }
}
