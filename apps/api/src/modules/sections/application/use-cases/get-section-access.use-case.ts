import { Inject, Injectable } from '@nestjs/common';
import {
  RoleSectionAccessRecord,
  UserSectionAccessRecord,
} from '../../domain/entities/section.entity';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

export interface SectionAccessResult {
  roleAccess: RoleSectionAccessRecord[];
  userAccess: UserSectionAccessRecord[];
}

@Injectable()
export class GetSectionAccessUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(sectionId: string): Promise<SectionAccessResult> {
    const section = await this.sections.findById(sectionId);
    if (!section) throw new SectionNotFoundError(sectionId);
    return this.sections.findAccessBySectionId(sectionId);
  }
}
