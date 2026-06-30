import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  type RoleRepositoryPort,
} from '../../../iam/application/ports/role-repository.port';
import { Section, SectionScope } from '../../domain/entities/section.entity';
import {
  SECTION_REPOSITORY,
  type SectionRepositoryPort,
} from '../ports/section-repository.port';
import { SectionAccessResolver } from '../services/section-access-resolver';

export interface SectionTreeNode {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  route: string | null;
  scope: SectionScope;
  order: number;
  isActive: boolean;
  apiRequirements: string[];
  children: SectionTreeNode[];
}

export interface GetSectionTreeInput {
  scope: SectionScope;
  userId: string;
}

@Injectable()
export class GetSectionTreeUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roles: RoleRepositoryPort,
    private readonly resolver: SectionAccessResolver,
  ) {}

  async execute(input: GetSectionTreeInput): Promise<SectionTreeNode[]> {
    const all = await this.sections.findAllActiveByScope(input.scope);
    if (all.length === 0) return [];

    const userRoles = await this.roles.findRolesByUserId(input.userId);
    const [userAccess, roleAccess] = await Promise.all([
      this.sections.findUserAccess(input.userId),
      userRoles.length > 0
        ? this.sections.findRoleAccess(userRoles.map((r) => r.id))
        : Promise.resolve([]),
    ]);

    const visibleIds = this.resolver.resolveVisibleSectionIds({
      sections: all,
      userAccess,
      roleAccess,
    });

    // Una sección visible pero con padre oculto sigue oculta — no se debe
    // emitir el subárbol huérfano. Filtramos en cascada desde la raíz.
    const visibleSections = all.filter((s) => visibleIds.has(s.id));
    return buildTree(visibleSections);
  }
}

function buildTree(sections: Section[]): SectionTreeNode[] {
  const byParent = new Map<string | null, Section[]>();
  const ids = new Set(sections.map((s) => s.id));
  for (const s of sections) {
    // Si el padre existe pero no es visible, tratamos al nodo como huérfano y
    // lo descartamos. Para sacarlo a la raíz cambiaríamos esto a `null`.
    const key = s.parentId && !ids.has(s.parentId) ? '__orphan__' : s.parentId;
    if (key === '__orphan__') continue;
    const list = byParent.get(key) ?? [];
    list.push(s);
    byParent.set(key, list);
  }

  function children(parentId: string | null): SectionTreeNode[] {
    const list = byParent.get(parentId) ?? [];
    return list
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => toNode(s));
  }

  function toNode(s: Section): SectionTreeNode {
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      icon: s.icon,
      route: s.route,
      scope: s.scope,
      order: s.order,
      isActive: s.isActive,
      apiRequirements: s.apiRequirements,
      children: children(s.id),
    };
  }

  return children(null);
}
