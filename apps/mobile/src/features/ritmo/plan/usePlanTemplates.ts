import { useEffect, useState } from 'react';
import { planApi, type PlanTemplate } from './plan.api';

let cache: PlanTemplate[] | null = null;

/** Sesiones tipo del servidor; no cambian, así que se piden una vez. */
export function usePlanTemplates(): PlanTemplate[] {
  const [list, setList] = useState<PlanTemplate[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    planApi
      .templates()
      .then((t) => {
        cache = t;
        if (alive) setList(t);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return list;
}
