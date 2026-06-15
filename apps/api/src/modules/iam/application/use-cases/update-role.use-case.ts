import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import { InvalidHierarchyError } from '../../domain/errors/invalid-hierarchy.error';
import { RoleNotFoundError } from '../../domain/errors/role-not-found.error';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
  type UpdateRolePatch,
} from '../ports/role-repository.port';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(id: string, patch: UpdateRolePatch): Promise<Role> {
    const existing = await this.roles.findById(id);
    if (!existing) throw new RoleNotFoundError(id);

    if (patch.parentRoleId !== undefined && patch.parentRoleId !== null) {
      if (patch.parentRoleId === id) {
        throw new InvalidHierarchyError('Un rol no puede ser su propio padre.');
      }
      const parent = await this.roles.findById(patch.parentRoleId);
      if (!parent) throw new RoleNotFoundError(patch.parentRoleId);

      // Detección de ciclo: si subiendo desde el parent propuesto pasamos
      // por nosotros mismos, sería un ciclo.
      const ancestors = await this.roles.findAncestorsIncludingSelf(
        patch.parentRoleId,
      );
      if (ancestors.some((a) => a.id === id)) {
        throw new InvalidHierarchyError(
          'Asignar este parent crearía un ciclo en la jerarquía de roles.',
        );
      }
    }

    return this.roles.update(id, patch);
  }
}
