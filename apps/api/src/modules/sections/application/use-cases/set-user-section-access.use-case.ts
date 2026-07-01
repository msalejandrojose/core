import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../../../iam/domain/errors/user-not-found.error';
import { SectionAccessType } from '../../domain/entities/section.entity';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

@Injectable()
export class SetUserSectionAccessUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(sectionId: string, userId: string, access: SectionAccessType): Promise<void> {
    const section = await this.sections.findById(sectionId);
    if (!section) throw new SectionNotFoundError(sectionId);

    const userExists = await this.sections.userExistsById(userId);
    if (!userExists) throw new UserNotFoundError(userId);

    await this.sections.setUserAccess(sectionId, userId, access);
  }
}
