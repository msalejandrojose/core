import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import {
  Filter,
  Limit,
  Order,
} from '../../../../shared/query';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { User, type UserType } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

export interface ListUsersInput {
  page: number;
  pageSize: number;
  sort?: string;
  order: 'asc' | 'desc';
  userType?: UserType;
  isActive?: boolean;
  emailContains?: string;
}

export interface ListUsersCursorInput {
  limit: number;
  cursor?: string;
  userType?: UserType;
  isActive?: boolean;
  emailContains?: string;
}

@Injectable()
export class ListUsersUseCase {
  // Columnas por las que se permite ordenar. Whitelist para que la API
  // pública no exponga `passwordHash` y otros campos sensibles.
  static readonly SORTABLE = ['createdAt', 'email', 'lastLoginAt'] as const;
  static readonly DEFAULT_SORT: keyof User = 'createdAt';

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: ListUsersInput): Promise<PaginatedResult<User>> {
    const filter = new Filter<User>();
    if (input.userType !== undefined) {
      filter.addEqualValue('userType', input.userType);
    }
    if (input.isActive !== undefined) {
      filter.addEqualValue('isActive', input.isActive);
    }
    if (input.emailContains) {
      filter.addLike('email', `%${input.emailContains}%`);
    }

    const sortField =
      input.sort && (ListUsersUseCase.SORTABLE as readonly string[]).includes(input.sort)
        ? (input.sort as keyof User)
        : ListUsersUseCase.DEFAULT_SORT;
    const order = new Order<User>().add(sortField, input.order);

    const limit = Limit.page(input.page, input.pageSize);

    return this.users.getRows({ filter, order, limit });
  }

  async executeWithCursor(input: ListUsersCursorInput): Promise<CursorPage<User>> {
    return this.users.listWithCursor({
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}
