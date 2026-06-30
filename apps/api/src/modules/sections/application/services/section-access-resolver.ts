import { Injectable } from '@nestjs/common';
import {
  RoleSectionAccessRecord,
  Section,
  UserSectionAccessRecord,
} from '../../domain/entities/section.entity';

/**
 * Resuelve qué secciones son visibles para un usuario aplicando, por orden:
 *
 * 1. Override de usuario sobre la sección concreta (`GRANT` muestra,
 *    `DENY` oculta).
 * 2. Si no hay override de usuario, agrega los registros de los roles del
 *    usuario: si alguno deniega, oculta; si alguno otorga, muestra.
 * 3. Por defecto (sin registros): oculto (deny-by-default).
 *
 * El servicio es puro — no toca repos ni IAM. Recibe los registros ya
 * cargados y devuelve el `Set<sectionId>` de secciones visibles.
 */
@Injectable()
export class SectionAccessResolver {
  resolveVisibleSectionIds(input: {
    sections: Section[];
    userAccess: UserSectionAccessRecord[];
    roleAccess: RoleSectionAccessRecord[];
  }): Set<string> {
    const userBySection = new Map(
      input.userAccess.map((r) => [r.sectionId, r.access]),
    );

    // Por sección, agregamos lo que dicen los roles: si alguno DENY → DENY.
    const roleBySection = new Map<string, 'GRANT' | 'DENY'>();
    for (const r of input.roleAccess) {
      const current = roleBySection.get(r.sectionId);
      if (current === 'DENY') continue; // ya denegado por otro rol
      if (r.access === 'DENY') {
        roleBySection.set(r.sectionId, 'DENY');
      } else if (!current) {
        roleBySection.set(r.sectionId, 'GRANT');
      }
    }

    const visible = new Set<string>();
    for (const section of input.sections) {
      const userOverride = userBySection.get(section.id);
      if (userOverride === 'DENY') continue;
      if (userOverride === 'GRANT') {
        visible.add(section.id);
        continue;
      }
      const roleVerdict = roleBySection.get(section.id);
      if (roleVerdict === 'GRANT') visible.add(section.id);
    }
    return visible;
  }
}
