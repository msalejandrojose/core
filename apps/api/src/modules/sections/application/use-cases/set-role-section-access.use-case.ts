import { Inject, Injectable } from '@nestjs/common';
import { RoleNotFoundError } from '../../../iam/domain/errors/role-not-found.error';
import { SectionAccessType } from '../../domain/entities/section.entity';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

@Injectable()
export class SetRoleSectionAccessUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(sectionId: string, roleId: string, access: SectionAccessType): Promise<void> {
    const section = await this.sections.findById(sectionId);
    if (!section) throw new SectionNotFoundError(sectionId);

    const roleExists = await this.sections.roleExistsById(roleId);
    if (!roleExists) throw new RoleNotFoundError(roleId);

    await this.sections.setRoleAccess(sectionId, roleId, access);
  }
}
