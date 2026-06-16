import { Inject, Injectable } from '@nestjs/common';
import { RoleInUseError } from '../../domain/errors/role-in-use.error';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const role = await this.roles.findById(id);
    if (!role) throw new RoleNotFoundError(id);
    if (await this.roles.isInUse(id)) throw new RoleInUseError(id);
    await this.roles.delete(id);
  }
}
