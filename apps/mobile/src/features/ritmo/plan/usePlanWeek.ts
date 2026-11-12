import { useEffect } from 'react';
import { todayIn } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { weekOf } from './plan-data';

/** Semana real del usuario (en su zona horaria) y su perfil para el objetivo de kcal. */
export function usePlanWeek() {
  const profile = useRitmoStore((s) => s.profile);
  const status = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  useEffect(() => {
    if (status === 'idle') void loadProfile();
  }, [status, loadProfile]);
  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  return { profile, today, ...weekOf(today) };
}
