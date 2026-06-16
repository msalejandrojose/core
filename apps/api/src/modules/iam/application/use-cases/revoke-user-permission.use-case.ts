import { Inject, Injectable } from '@nestjs/common';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
} from '../ports/permission-repository.port';

@Injectable()
export class RevokeUserPermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async execute(userId: string, sectionId: string): Promise<void> {
    await this.permissions.deleteUserPermission(userId, sectionId);
  }
}
