import { Inject, Injectable } from '@nestjs/common';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import { RoleScopeMismatchError } from '../../domain/errors/role-scope-mismatch.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

@Injectable()
export class AssignRoleToUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(
    userId: string,
    roleId: string,
    assignedByUserId: string | null,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const role = await this.roles.findById(roleId);
    if (!role) throw new RoleNotFoundError(roleId);

    // Guard-rail: scope del rol tiene que ser compatible con userType.
    if (!role.appliesTo(user.userType)) {
      throw new RoleScopeMismatchError(role.scope, user.userType);
    }

    // Idempotente: si ya está asignado, no error.
    if (await this.roles.isAssignedToUser(userId, roleId)) return;

    await this.roles.assignToUser(userId, roleId, assignedByUserId);
  }
}
