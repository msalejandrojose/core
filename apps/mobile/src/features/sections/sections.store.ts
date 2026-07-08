import { create } from 'zustand';
import type { SectionTreeNode } from '@core/sections';
import { apiClient } from '@/api/client';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/** Nodo tal cual lo devuelve la API (icon/route nullable). */
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

/** Normaliza null→undefined para casar con el tipo canónico de @core/sections. */
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

interface SectionsState {
  tree: SectionTreeNode[];
  status: Status;
  /** Carga el árbol APP (filtrado por permisos). Idempotente salvo `force`. */
  load: (force?: boolean) => Promise<void>;
}

/**
 * Árbol de secciones navegables de la app (`GET /sections/tree?scope=APP`),
 * filtrado por los permisos del usuario. Compartido entre la home (menú de
 * accesos) y las pantallas de sección, para no re-pedirlo en cada navegación.
 *
 * Nota: hoy el seed solo crea secciones BACKOFFICE, así que para un usuario APP
 * el árbol llega vacío hasta que se seedeen secciones con scope APP.
 */
export const useSectionsStore = create<SectionsState>((set, get) => ({
  tree: [],
  status: 'idle',
  load: async (force = false) => {
    if (!force && (get().status === 'loading' || get().status === 'ready')) {
      return;
    }
    set({ status: 'loading' });
    try {
      const { data, error } = await apiClient.GET('/sections/tree', {
        params: { query: { scope: 'APP' } },
      });
      if (error || !data) {
        set({ status: 'error' });
        return;
      }
      set({ tree: (data as ApiNode[]).map(normalize), status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },
}));
