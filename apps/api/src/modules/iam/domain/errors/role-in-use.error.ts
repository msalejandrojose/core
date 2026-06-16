import { DomainError } from './domain-error';

export class RoleInUseError extends DomainError {
  readonly code = 'ROLE_IN_USE';

  constructor(roleId: string) {
    super(
      `El rol "${roleId}" no puede borrarse porque tiene usuarios asignados o permisos configurados.`,
    );
  }
}
