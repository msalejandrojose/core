import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Role } from '../../domain/entities/role.entity';
import {
  ROLE_REPOSITORY,
  type ListRolesOptions,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

@Injectable()
export class ListRolesUseCase {
  static readonly SORTABLE = ['createdAt', 'code', 'name'] as const;

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(opts: ListRolesOptions): Promise<PaginatedResult<Role>> {
    const sort = opts.sort && (ListRolesUseCase.SORTABLE as readonly string[]).includes(opts.sort)
      ? opts.sort
      : 'createdAt';
    return this.roles.findMany({ ...opts, sort });
  }
}
