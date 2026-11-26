import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { MUSCLE_NAME } from '../performance/labels';
import { startFromRoutine } from '../live/live-workout';
import { previousSetsApi } from '../live/live.api';
import { useLiveStore } from '../live/live.store';
import { useRegisterStore } from '../register.store';
import type { Routine } from './routines.api';

/**
 * Empezar una rutina de un toque:
 * - gimnasio → el entreno en directo de Brío, serie a serie, con los pesos de
 *   la rutina (o los de la última vez);
 * - cardio → la hoja de registrar entreno con la rutina ya elegida (traerlo de
 *   Garmin al acabar o apuntarlo a mano).
 * Con un entreno en curso no se pisa: se abre el que ya tienes.
 */
export function useStartRoutine(onDone?: () => void) {
  const history = useHistory();
  const live = useLiveStore((s) => s.workout);
  const startLive = useLiveStore((s) => s.set);
  const openRegister = useRegisterStore((s) => s.open);
  const [busy, setBusy] = useState(false);

  async function start(r: Routine) {
    if (r.kind !== 'STRENGTH') {
      onDone?.();
      openRegister('activity', undefined, { routineId: r.id });
      return;
    }
    if (live) {
      toast.info('Ya tienes un entreno en curso', `Termínalo o descártalo antes de empezar «${r.name}».`);
      onDone?.();
      history.push('/tabs/today/entreno');
      return;
    }
    setBusy(true);
    try {
      const previous = await previousSetsApi.get(r.exercises.map((e) => e.exerciseId)).catch(() => []);
      startLive(startFromRoutine(r, previous, (m) => MUSCLE_NAME[m] ?? m));
      onDone?.();
      history.push('/tabs/today/entreno');
    } finally {
      setBusy(false);
    }
  }

  return { start, busy };
}
