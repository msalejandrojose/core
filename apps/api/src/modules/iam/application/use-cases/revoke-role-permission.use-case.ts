import { Inject, Injectable } from '@nestjs/common';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
} from '../ports/permission-repository.port';

@Injectable()
export class RevokeRolePermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async execute(roleId: string, sectionId: string): Promise<void> {
    await this.permissions.deleteRolePermission(roleId, sectionId);
  }
}
