import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

@Injectable()
export class GetRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(id: string): Promise<Role> {
    const role = await this.roles.findById(id);
    if (!role) throw new RoleNotFoundError(id);
    return role;
  }
}
