import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
  type UserPermissionEntry,
} from '../ports/permission-repository.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

@Injectable()
export class ListUserPermissionsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserPermissionEntry[]> {
    if (!(await this.users.findById(userId))) {
      throw new UserNotFoundError(userId);
    }
    return this.permissions.listUserPermissions(userId);
  }
}
