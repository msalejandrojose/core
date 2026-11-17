import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { useLiveStore } from './live.store';
import { mergeActivityState, toActivityState } from './live-activity';
import { liveActivity, liveActivitySupported } from './live-activity.native';

/**
 * Mantiene la Live Activity de iOS al día con el entreno en vivo, en los dos
 * sentidos: lo que cambias en la app se ve en la pantalla bloqueada y en la
 * isla, y lo que tocas allí (serie hecha, peso, repes, ejercicio) se aplica al
 * entreno al volver a la app o en cuanto la app se entera. Montar una vez.
 */
export function useLiveActivitySync() {
  const workout = useLiveStore((s) => s.workout);
  const update = useLiveStore((s) => s.update);
  const rev = useRef(0);
  const active = useRef(false);

  // Recoger cambios hechos desde la Live Activity.
  useEffect(() => {
    if (!liveActivitySupported()) return;
    const pull = async () => {
      try {
        const { state } = await liveActivity.takeChanges();
        if (!state) return;
        rev.current = Math.max(rev.current, state.rev);
        if (useLiveStore.getState().workout) update((w) => mergeActivityState(w, state));
      } catch {
        // Sin plugin o sin actividad: nada que recoger.
      }
    };
    void pull();
    const subs = [liveActivity.addListener('change', () => void pull()), App.addListener('resume', () => void pull())];
    return () => {
      for (const s of subs) void s.then((h) => h.remove());
    };
  }, [update]);

  // Empujar el estado del entreno (con un poco de calma: escribir un peso no
  // debe mandar una actualización por tecla).
  useEffect(() => {
    if (!liveActivitySupported()) return;
    if (!workout) {
      if (active.current) {
        active.current = false;
        void liveActivity.end().catch(() => undefined);
      }
      return;
    }
    const t = window.setTimeout(() => {
      const state = toActivityState(workout, rev.current);
      const call = active.current ? liveActivity.update({ state }) : liveActivity.start({ state });
      void call.then((r) => (active.current = r.active)).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(t);
  }, [workout]);
}
