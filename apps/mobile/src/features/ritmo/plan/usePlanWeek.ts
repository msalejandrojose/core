import { useEffect } from 'react';
import { todayIn } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { dayNumber, shiftDay } from './plan-labels';

/** Perfil del usuario y los siete días (lunes a domingo) de su semana actual. */
export function usePlanWeek() {
  const profile = useRitmoStore((s) => s.profile);
  const status = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  useEffect(() => {
    if (status === 'idle') void loadProfile();
  }, [status, loadProfile]);
  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const monday = shiftDay(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(monday, i);
    return { date, n: dayNumber(date) };
  });
  return { profile, days };
}
