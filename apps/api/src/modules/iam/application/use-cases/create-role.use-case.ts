import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Role, type RoleScope } from '../../domain/entities/role.entity';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists.error';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string | null;
  scope: RoleScope;
  parentRoleId?: string | null;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    if (await this.roles.findByCode(input.code)) {
      throw new RoleAlreadyExistsError(input.code);
    }

    if (input.parentRoleId) {
      const parent = await this.roles.findById(input.parentRoleId);
      if (!parent) throw new RoleNotFoundError(input.parentRoleId);
    }

    const now = new Date();
    const role = new Role(
      randomUUID(),
      input.code,
      input.name,
      input.description ?? null,
      input.scope,
      input.parentRoleId ?? null,
      now,
      now,
    );
    return this.roles.create(role);
  }
}
