import { Inject, Injectable } from '@nestjs/common';
import { type PermissionLevel } from '../../domain/entities/permission-level';
import { ApiSectionNotFoundError } from '../../domain/errors/api-section-not-found.error';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
} from '../ports/api-section-repository.port';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
} from '../ports/permission-repository.port';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

// Idempotente: si ya hay permiso, lo reemplaza.
@Injectable()
export class GrantRolePermissionUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async execute(
    roleId: string,
    sectionId: string,
    level: PermissionLevel,
  ): Promise<void> {
    if (!(await this.roles.findById(roleId))) {
      throw new RoleNotFoundError(roleId);
    }
    if (!(await this.sections.findById(sectionId))) {
      throw new ApiSectionNotFoundError(sectionId);
    }
    await this.permissions.upsertRolePermission(roleId, sectionId, level);
  }
}
