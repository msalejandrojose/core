import { Inject, Injectable } from '@nestjs/common';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
  type RolePermissionEntry,
} from '../ports/permission-repository.port';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

@Injectable()
export class ListRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async execute(roleId: string): Promise<RolePermissionEntry[]> {
    if (!(await this.roles.findById(roleId))) {
      throw new RoleNotFoundError(roleId);
    }
    return this.permissions.listRolePermissions(roleId);
  }
}
