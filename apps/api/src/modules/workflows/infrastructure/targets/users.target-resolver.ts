import { Inject, Injectable } from '@nestjs/common';
import { Filter, Limit } from '../../../../shared/query';
import { User, UserType } from '../../../iam/domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../iam/application/ports/user-repository.port';
import {
  TargetDescriptor,
  TargetRef,
  TargetResolver,
} from '../../application/ports/target-resolver.port';

// Tope de entidades que resuelve un target de una sola pasada, para no hacer
// fan-out de millones de runs por accidente. Si se necesita más, será
// paginación/streaming en una iteración posterior.
const MAX_TARGETS = 5000;

// Resolver built-in del target `users`. Filtro soportado (todo opcional):
//   { isActive?: boolean; userType?: UserType }
// Por defecto resuelve sólo usuarios activos.
@Injectable()
export class UsersTargetResolver implements TargetResolver {
  readonly type = 'users';

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async resolve(descriptor: TargetDescriptor): Promise<TargetRef[]> {
    const raw = descriptor.filter ?? {};
    const filter = new Filter<User>();

    filter.addEqualValue(
      'isActive',
      typeof raw.isActive === 'boolean' ? raw.isActive : true,
    );
    if (typeof raw.userType === 'string') {
      filter.addEqualValue('userType', raw.userType as UserType);
    }

    const { items } = await this.users.getRows({
      filter,
      limit: new Limit(MAX_TARGETS),
    });

    return items.map((user) => ({
      id: user.id,
      entityType: 'user',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        isActive: user.isActive,
      },
    }));
  }
}
