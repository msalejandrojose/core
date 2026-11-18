import { useEffect, useRef, useState } from 'react';
import type { ActivitySession } from '../api';
import { perfApi } from '../performance/perf.api';

export type PreviousSet = NonNullable<ActivitySession['sets']>[number];

/** Cuántos entrenos hacia atrás se miran como mucho (y cuántos se abren). */
const LOOKBACK = 20;
const MAX_DETAILS = 8;

/**
 * Las series de la última vez que se hizo cada ejercicio, para enseñarlas como
 * referencia ("Anterior") al apuntar. `before` limita a entrenos anteriores a
 * esa fecha (al editar uno guardado, para no compararlo consigo mismo).
 *
 * Devuelve, por ejercicio: `undefined` mientras se busca, `null` si no hay
 * registro previo y la lista de series si lo hay. Si la API falla, se trata
 * como "sin registro": la referencia es una ayuda, no debe romper el editor.
 */
export function usePreviousSets(exerciseIds: string[], before: string | null = null): Record<string, PreviousSet[] | null> {
  const [found, setFound] = useState<Record<string, PreviousSet[] | null>>({});
  const sessions = useRef<Promise<ActivitySession[]> | null>(null);
  const details = useRef(new Map<string, Promise<ActivitySession | null>>());
  const key = [...new Set(exerciseIds)].sort().join(',');

  useEffect(() => {
    const wanted = key ? key.split(',').filter((id) => !(id in found)) : [];
    if (wanted.length === 0) return;
    let alive = true;

    sessions.current ??= perfApi
      .history(before, LOOKBACK)
      .then((list) => list.filter((s) => s.kind === 'STRENGTH' || (s.sets?.length ?? 0) > 0))
      .catch(() => []);
    const detail = (s: ActivitySession) => {
      if (s.sets?.length) return Promise.resolve(s);
      let p = details.current.get(s.id);
      if (!p) {
        p = perfApi.session(s.id).catch(() => null);
        details.current.set(s.id, p);
      }
      return p;
    };

    void (async () => {
      const list = await sessions.current!;
      const result: Record<string, PreviousSet[] | null> = Object.fromEntries(wanted.map((id) => [id, null]));
      let pending = new Set(wanted);
      for (const s of list.slice(0, MAX_DETAILS)) {
        if (pending.size === 0) break;
        const full = await detail(s);
        for (const id of pending) {
          const sets = (full?.sets ?? []).filter((x) => x.exerciseId === id);
          if (sets.length === 0) continue;
          // Si el ejercicio salió dos veces en la sesión, vale el primer bloque.
          const order = Math.min(...sets.map((x) => x.exerciseOrder));
          result[id] = sets.filter((x) => x.exerciseOrder === order).sort((a, b) => a.setOrder - b.setOrder);
        }
        pending = new Set([...pending].filter((id) => result[id] === null));
      }
      if (alive) setFound((f) => ({ ...f, ...result }));
    })();

    return () => {
      alive = false;
    };
    // `found` se lee solo para no repetir búsquedas; no debe relanzar el efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, before]);

  return found;
}
