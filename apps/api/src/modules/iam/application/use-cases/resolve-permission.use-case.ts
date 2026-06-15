import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PermissionLevels,
  type PermissionLevel,
} from '../../domain/entities/permission-level';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
} from '../ports/api-section-repository.port';
import {
  PERMISSION_REPOSITORY,
  type PermissionRepositoryPort,
} from '../ports/permission-repository.port';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../ports/role-repository.port';

// El resolver es el corazón del módulo de autorización. Devuelve si un
// usuario tiene al menos el `required` nivel sobre `sectionCode`.
//
// Algoritmo (resumido):
//
//   1. Resolver `sectionCode` → ApiSection. Si no existe → DENY.
//   2. Construir `sectionPath = [section, parent, ..., root]`.
//   3. **Override de usuario**: por cada s en sectionPath, busca
//      `user_api_section_permission(userId, s.id)`. El primer match gana —
//      `NONE` bloquea explícitamente; cualquier otro nivel se compara con
//      `required`.
//   4. Si no hubo override: por cada rol directamente asignado al usuario,
//      construye su `roleChain = [role, parent, ..., root]`. Por cada r en
//      la cadena, busca permisos sobre cada s del sectionPath; el primer
//      match en (rol, sección) detiene el walk para ese roleChain. Si el
//      nivel encontrado es `NONE` → DENY inmediato. Si no, contribuye al
//      `bestLevel` (max sobre todos los roles directos del usuario).
//   5. Si no se encontró nivel alguno → DENY. En otro caso compara
//      `bestLevel` contra `required`.
//
// Semántica de seguridad por defecto: deny wins (NONE explícito en cualquier
// rol bloquea). Sin permisos = sin acceso.
@Injectable()
export class ResolvePermissionUseCase {
  private readonly logger = new Logger(ResolvePermissionUseCase.name);

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
  ) {}

  async isAllowed(
    userId: string,
    sectionCode: string,
    required: PermissionLevel,
  ): Promise<boolean> {
    const section = await this.sections.findByCode(sectionCode);
    if (!section) {
      this.logger.warn(
        `Permission check for unknown section "${sectionCode}" — denied.`,
      );
      return false;
    }

    const sectionPath = await this.sections.findAncestorsIncludingSelf(
      section.id,
    );
    const sectionIds = sectionPath.map((s) => s.id);

    // 1) User overrides
    const userPerms = await this.permissions.findUserPermissionsForUser(
      userId,
      sectionIds,
    );
    const userPermBySection = new Map(
      userPerms.map((p) => [p.apiSectionId, p.permissionLevel]),
    );
    for (const s of sectionPath) {
      const level = userPermBySection.get(s.id);
      if (level !== undefined) {
        return PermissionLevels.satisfies(level, required);
      }
    }

    // 2) Roles + herencia
    const directRoles = await this.roles.findRolesByUserId(userId);
    if (directRoles.length === 0) return false;

    let bestLevel: PermissionLevel | null = null;

    for (const direct of directRoles) {
      const roleChain = await this.roles.findAncestorsIncludingSelf(direct.id);
      const roleIds = roleChain.map((r) => r.id);
      const rolePerms = await this.permissions.findRolePermissionsForRoles(
        roleIds,
        sectionIds,
      );

      // Index: roleId → (sectionId → level)
      const byRoleThenSection = new Map<string, Map<string, PermissionLevel>>();
      for (const rp of rolePerms) {
        let perRole = byRoleThenSection.get(rp.userRoleId);
        if (!perRole) {
          perRole = new Map();
          byRoleThenSection.set(rp.userRoleId, perRole);
        }
        perRole.set(rp.apiSectionId, rp.permissionLevel);
      }

      // Walk: por la cadena de roles, primer match en sectionPath gana.
      outer: for (const r of roleChain) {
        const perRole = byRoleThenSection.get(r.id);
        if (!perRole) continue;
        for (const s of sectionPath) {
          const level = perRole.get(s.id);
          if (level !== undefined) {
            if (level === 'NONE') return false; // bloqueo explícito
            bestLevel = PermissionLevels.max(bestLevel, level);
            break outer;
          }
        }
      }
    }

    if (bestLevel === null) return false;
    return PermissionLevels.satisfies(bestLevel, required);
  }
}
