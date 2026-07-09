import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Una página de la paginación por cursor tal como la envuelve el API
 * (`{ data, meta }`, ver `CursorPaginatedResponseDto` en la API y `CursorMeta`
 * en `@core/shared-types`). Genérico sobre el tipo de item para poder reusarlo
 * en cualquier listado (secciones, notificaciones, …).
 */
export interface CursorPage<T> {
  data: T[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

/**
 * Función que trae una página del listado. El consumidor la cierra sobre el
 * endpoint concreto (p. ej. `apiClient.GET('/me/notifications', …)`) y devuelve
 * la página cruda, o `null` si la respuesta fue un error controlado.
 */
export type CursorFetcher<T> = (params: {
  cursor: string | null;
  limit: number;
}) => Promise<CursorPage<T> | null>;

export type CursorListStatus = 'loading' | 'ready' | 'error';

export interface UseCursorListOptions {
  /** Tamaño de página (default 20). */
  limit?: number;
  /** Cargar la primera página al montar (default true). */
  immediate?: boolean;
}

export interface UseCursorList<T> {
  items: T[];
  status: CursorListStatus;
  /** `true` si hay una página siguiente que traer con `loadMore`. */
  hasMore: boolean;
  /** Recarga desde la primera página (pull-to-refresh / reintento). */
  reload: () => Promise<void>;
  /** Trae y concatena la siguiente página (scroll infinito). No-op si no hay. */
  loadMore: () => Promise<void>;
  /**
   * Mutador del estado local, para actualizaciones optimistas del consumidor
   * (marcar leído, borrar una fila…) sin re-pedir la lista entera.
   */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Máquina de estado reutilizable para listados paginados por cursor. Extrae el
 * patrón `load` / `loadMore` / `reload` que se repetía inline en el inbox, y es
 * la base de datos del `CursorList` (equivalente móvil del DataTable del
 * backoffice, BO-04).
 *
 * El `fetcher` puede cambiar de identidad en cada render (cierra sobre props):
 * lo guardamos en un ref para que `reload` sea estable y el efecto de montaje
 * no entre en bucle. Cambiar `limit` sí re-carga desde el principio.
 */
export function useCursorList<T>(
  fetcher: CursorFetcher<T>,
  options: UseCursorListOptions = {},
): UseCursorList<T> {
  const { limit = 20, immediate = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<CursorListStatus>(
    immediate ? 'loading' : 'ready',
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  // Mantener el ref fresco fuera de render (regla react-hooks/refs). El valor
  // inicial de `useRef` ya apunta al primer fetcher, así que la carga de montaje
  // usa el fetcher correcto aunque este efecto corra después.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      const page = await fetcherRef.current({ cursor: null, limit });
      if (!page) {
        setStatus('error');
        return;
      }
      setItems(page.data);
      setNextCursor(page.meta.hasMore ? page.meta.nextCursor : null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [limit]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    try {
      const page = await fetcherRef.current({ cursor: nextCursor, limit });
      if (!page) return;
      setItems((prev) => [...prev, ...page.data]);
      setNextCursor(page.meta.hasMore ? page.meta.nextCursor : null);
    } catch {
      // Silencioso: una página siguiente que falla no rompe la lista ya
      // pintada; el usuario puede reintentar el scroll.
    }
  }, [nextCursor, limit]);

  useEffect(() => {
    if (immediate) void reload();
  }, [immediate, reload]);

  return {
    items,
    status,
    hasMore: nextCursor !== null,
    reload,
    loadMore,
    setItems,
  };
}
