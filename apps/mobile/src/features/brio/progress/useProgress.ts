import { useEffect, useState } from 'react';
import { brioApi, type Progress } from '../api';

/** Progreso de los últimos `days` días, recargado al cambiar el periodo. */
export function useProgress(days: number) {
  const [data, setData] = useState<Progress | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setError(false);
    brioApi
      .getProgress(days)
      .then((p) => alive && setData(p))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [days]);
  return { data, error };
}
