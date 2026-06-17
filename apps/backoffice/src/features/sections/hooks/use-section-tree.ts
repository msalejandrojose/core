// BO-07 — Hook para cargar el árbol de secciones del backoffice
//
// Consume `GET /sections/tree?scope=BACKOFFICE` a través del singleton
// `@/api/client` (creado en BO-01). El caché de 5 min evita refetch al
// navegar entre páginas; se invalida explícitamente desde el módulo de
// secciones cuando cambia la estructura o los roles del usuario.
//
// Nota: este archivo asume que `@core/api-client` ya expone el endpoint
// `/sections/tree`, que será generado a partir del OpenAPI cuando el
// módulo backend `sections` (TASK-38) esté implementado.

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useSectionTree() {
  return useQuery({
    queryKey: ['section-tree', 'BACKOFFICE'] as const,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/sections/tree', {
        params: { query: { scope: 'BACKOFFICE' } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 min: el árbol cambia poco
  });
}
