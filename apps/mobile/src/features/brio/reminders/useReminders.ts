import { useEffect, useMemo } from 'react';
import type { MealType } from '../api';
import { useBrioStore } from '../brio.store';
import { todayIn } from '../format';
import { useAlertPrefs } from '../pages/alert-prefs';
import { useRecovery } from '../pages/recovery.api';
import { usePlanWeekData, type PlanDay } from '../plan/plan.api';
import { shiftDay } from '../plan/plan-labels';
import { planReminders, type PlannedLite } from './reminders';
import { syncReminders } from './reminders.native';

const lite = (d: PlanDay | null | undefined): PlannedLite | null =>
  d?.planned
    ? {
        title: d.planned.title,
        startTime: d.planned.startTime,
        load: d.planned.load,
        done: d.status === 'DONE' || !!d.actual || !!d.planned.completedAt || d.planned.skipped,
      }
    : null;

/**
 * Reprograma los recordatorios locales cada vez que cambia algo que les
 * afecta: lo registrado hoy, el plan, la recuperación o lo que tienes activado
 * en Avisos. Va en el shell de pestañas, así que corre con la app abierta.
 */
export function useReminders() {
  const profile = useBrioStore((s) => s.profile);
  const summary = useBrioStore((s) => s.summary);
  const on = useAlertPrefs((s) => s.on);
  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const today = todayIn(timezone);
  const tomorrow = shiftDay(today, 1);
  const { data: week } = usePlanWeekData(today);
  // Si mañana cae en otra semana (domingo), se pide esa también.
  const { data: nextWeek } = usePlanWeekData(tomorrow);
  const { data: recovery } = useRecovery();

  const input = useMemo(() => {
    if (!summary || summary.day !== today) return null;
    const days = [...(week?.days ?? []), ...(nextWeek?.days ?? [])];
    const diet = [...(week?.diet ?? []), ...(nextWeek?.diet ?? [])];
    const tm = lite(days.find((d) => d.day === tomorrow));
    return {
      loggedMeals: new Set<MealType>(summary.meals.map((m) => m.mealType)),
      kcalRemaining: summary.totals.kcalRemaining,
      today: lite(days.find((d) => d.day === today)),
      tomorrow: tm ? { ...tm, dietKcal: diet.find((d) => d.day === tomorrow)?.kcalTarget ?? null } : null,
      recovery: recovery?.score ?? null,
    };
  }, [summary, week, nextWeek, recovery, today, tomorrow]);

  useEffect(() => {
    if (!input) return;
    const t = window.setTimeout(() => {
      void syncReminders(planReminders({ now: new Date(), on, ...input }));
    }, 800);
    return () => window.clearTimeout(t);
  }, [input, on]);
}
