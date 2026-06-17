import { useQuery } from '@tanstack/react-query';
import { BACKOFFICE_SECTION_TREE } from '../section-tree';
import type { SectionTreeNode } from '../types';

/**
 * Árbol de secciones navegables del backoffice.
 *
 * ⚠️ Hoy devuelve un árbol local (TASK-38 aún no implementa el módulo backend).
 * Cuando exista `GET /sections/tree`, sustituir el `queryFn` por:
 *
 *   const { data, error } = await apiClient.GET('/sections/tree', {
 *     params: { query: { scope: 'BACKOFFICE' } },
 *   });
 *   if (error) throw error;
 *   return data;
 *
 * El resto de la app (header/tabs) no cambia: consume `SectionTreeNode[]`.
 */
export function useSectionTree() {
  return useQuery<SectionTreeNode[]>({
    queryKey: ['section-tree', 'BACKOFFICE'],
    queryFn: async () => BACKOFFICE_SECTION_TREE,
    staleTime: 1000 * 60 * 5, // 5 min: el árbol cambia poco
  });
}
