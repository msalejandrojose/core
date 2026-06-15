import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

@Injectable()
export class UnassignRoleFromUserUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(userId: string, roleId: string): Promise<void> {
    // Idempotente: si no estaba asignado, no error.
    if (!(await this.roles.isAssignedToUser(userId, roleId))) return;
    await this.roles.unassignFromUser(userId, roleId);
  }
}
