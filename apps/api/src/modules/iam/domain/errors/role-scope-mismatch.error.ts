import { DomainError } from './domain-error';
import type { RoleScope } from '../entities/role.entity';
import type { UserType } from '../entities/user.entity';

export class RoleScopeMismatchError extends DomainError {
  readonly code = 'ROLE_SCOPE_MISMATCH';

  constructor(roleScope: RoleScope, userType: UserType) {
    super(
      `Rol con scope "${roleScope}" no puede asignarse a un usuario de tipo "${userType}".`,
    );
  }
}
