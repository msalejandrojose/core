import { Inject, Injectable } from '@nestjs/common';
import { type PermissionLevel } from '../../domain/entities/permission-level';
import { ApiSectionNotFoundError } from '../../domain/errors/api-section-not-found.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
} from '../ports/api-section-repository.port';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
} from '../ports/permission-repository.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

// Override por usuario: gana sobre los permisos del rol cuando existe.
@Injectable()
export class GrantUserPermissionUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async execute(
    userId: string,
    sectionId: string,
    level: PermissionLevel,
  ): Promise<void> {
    if (!(await this.users.findById(userId))) {
      throw new UserNotFoundError(userId);
    }
    if (!(await this.sections.findById(sectionId))) {
      throw new ApiSectionNotFoundError(sectionId);
    }
    await this.permissions.upsertUserPermission(userId, sectionId, level);
  }
}
