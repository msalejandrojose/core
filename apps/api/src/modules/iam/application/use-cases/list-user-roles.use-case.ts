import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
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
export class ListUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(userId: string): Promise<Role[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    return this.roles.findRolesByUserId(userId);
  }
}
