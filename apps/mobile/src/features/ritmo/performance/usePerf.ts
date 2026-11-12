import { useCallback, useEffect, useState } from 'react';

/** Carga un análisis y lo recarga al cambiar `key` (el periodo, por ejemplo). */
export function usePerf<T>(load: () => Promise<T>, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    load()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
    // `load` cambia en cada render; lo que decide recargar es `key` y `tick`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
