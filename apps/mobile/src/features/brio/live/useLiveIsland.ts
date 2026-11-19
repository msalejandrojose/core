import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { toast, useIslandStore, type LiveIsland } from '@/lib/toast';
import { tapSuccess } from '../haptics';
import { addRest, progress, skipRest, workNumber, type LiveWorkout } from './live-workout';
import { useLiveStore } from './live.store';

export const LIVE_PATH = '/tabs/today/entreno';

/** Lo siguiente que toca: ejercicio y número de serie (las de calentamiento salen como tal). */
export function nextUp(w: LiveWorkout): { name: string; set: string } | null {
  for (const e of w.exercises) {
    const k = e.sets.findIndex((s) => !s.done);
    if (k >= 0) {
      const n = workNumber(e, k);
      return { name: e.name, set: n === null ? 'calentamiento' : `serie ${n}` };
    }
  }
  return null;
}

/** Qué enseña la isla en pequeño: el descanso si corre, si no el entreno. */
export function liveIslandFor(
  w: LiveWorkout,
  now: number,
  actions: { onAdd: () => void; onSkip: () => void; onOpen: () => void },
): LiveIsland {
  if (w.restUntil && w.restUntil > now) {
    return {
      kind: 'rest',
      until: w.restUntil,
      total: w.restFor ?? Math.round((w.restUntil - now) / 1000),
      next: nextUp(w)?.name ?? null,
      onAdd: actions.onAdd,
      onSkip: actions.onSkip,
    };
  }
  const p = progress(w);
  return { kind: 'workout', name: w.name, startedAt: w.startedAt, done: p.done, total: p.total, volumeKg: p.volumeKg, onOpen: actions.onOpen };
}

/**
 * Con un entreno en curso y fuera de su pantalla, el descanso (o el entreno)
 * se queda en la isla, en pequeño. Si el descanso acaba mientras estás en
 * otra pantalla, la isla avisa de lo que toca con «Ir». Montar una vez en el
 * shell autenticado.
 */
export function useLiveIsland() {
  const workout = useLiveStore((s) => s.workout);
  const update = useLiveStore((s) => s.update);
  const { pathname } = useLocation();
  const history = useHistory();
  const setLive = useIslandStore((s) => s.setLive);
  const away = !!workout && pathname !== LIVE_PATH;
  const restUntil = workout?.restUntil ?? null;
  const wasResting = useRef(false);

  useEffect(() => {
    if (!workout || !away) {
      setLive(null);
      return;
    }
    const open = () => history.push(LIVE_PATH);
    const refresh = () =>
      setLive(
        liveIslandFor(workout, Date.now(), {
          onAdd: () => update((w) => addRest(w, 15)),
          onSkip: () => update(skipRest),
          onOpen: open,
        }),
      );
    refresh();
    // Al acabar el descanso, de anillo a entreno (y aviso de lo que toca).
    if (restUntil && restUntil > Date.now()) {
      wasResting.current = true;
      const t = window.setTimeout(() => {
        refresh();
        if (!wasResting.current) return;
        wasResting.current = false;
        void tapSuccess();
        const next = nextUp(workout);
        toast.success('Descanso terminado', next ? `Ahora: ${next.name} · ${next.set}` : undefined, {
          tone: 'activity',
          action: { label: 'Ir', run: open },
          duration: 4000,
        });
      }, restUntil - Date.now());
      return () => window.clearTimeout(t);
    }
    wasResting.current = false;
  }, [workout, away, restUntil, setLive, update, history]);

  useEffect(() => () => setLive(null), [setLive]);
}
