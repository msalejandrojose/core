import type { UserRoleModel } from '../../../../generated/prisma/models';
import { Role, type RoleScope } from '../../domain/entities/role.entity';

// Notar: en el dominio se llama `Role`; en Prisma se llama `UserRole` (porque
// es la tabla `user_role` en el schema, pero el "Role" es como nos referimos
// a ellos conceptualmente). Este mapper aísla esa diferencia de naming.
export class RoleMapper {
  static toDomain(row: UserRoleModel): Role {
    return new Role(
      row.id,
      row.code,
      row.name,
      row.description,
      row.scope as RoleScope,
      row.parentRoleId,
      row.createdAt,
      row.updatedAt,
    );
  }

  static toPersistenceCreate(role: Role) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      scope: role.scope,
      parentRoleId: role.parentRoleId,
    };
  }
}
