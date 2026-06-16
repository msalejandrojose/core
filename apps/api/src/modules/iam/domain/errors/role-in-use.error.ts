import { DomainError } from './domain-error';

export class RoleInUseError extends DomainError {
  constructor(roleId: string) {
    super(
      'ROLE_IN_USE',
      `El rol "${roleId}" no puede borrarse porque tiene usuarios asignados o permisos configurados.`,
      { roleId },
    );
  }
}
