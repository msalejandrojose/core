import { useQuery } from '@tanstack/react-query';
import type { SectionTreeNode } from '@core/sections';
import { apiClient } from '@/api/client';

/**
 * Árbol de secciones navegables del backoffice, servido por
 * `GET /sections/tree?scope=BACKOFFICE` y filtrado por los permisos del
 * usuario autenticado. Normalizamos `icon`/`route` (`null` en el backend) a
 * opcional para casar con el tipo canónico de `@core/sections`.
 */
export function useSectionTree() {
  return useQuery<SectionTreeNode[]>({
    queryKey: ['section-tree', 'BACKOFFICE'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/sections/tree', {
        params: { query: { scope: 'BACKOFFICE' } },
      });
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
    staleTime: 1000 * 60 * 5,
  });
}

interface ApiNode {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  route?: string | null;
  scope: 'BACKOFFICE' | 'APP' | 'SHARED';
  order: number;
  isActive: boolean;
  apiRequirements?: string[];
  children: ApiNode[];
}

function normalize(node: ApiNode): SectionTreeNode {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    icon: node.icon ?? undefined,
    route: node.route ?? undefined,
    scope: node.scope,
    order: node.order,
    isActive: node.isActive,
    apiRequirements: node.apiRequirements,
    children: node.children.map(normalize),
  };
}
