import type { RitmoProfile } from '../api';
import { formatDuration, formatKcal, formatNumber } from '../format';
import type { ProgressDay } from './stats';

export type Status = 'ok' | 'near' | 'low' | 'pending';

export interface ReportItem {
  label: string;
  value: string;
  target: string;
  /** Progreso hacia el objetivo, 0–100 (para la barra). */
  pct: number;
  status: Status;
}

export interface ReportGroup {
  title: string;
  items: ReportItem[];
}

export const STATUS_LABEL: Record<Status, string> = {
  ok: 'Cumplido',
  near: 'Cerca',
  low: 'Por debajo',
  pending: 'En curso',
};

/** Cumplido con ≥95 %, cerca con ≥80 %, si no por debajo. */
export function statusFor(ratio: number): Status {
  if (ratio >= 0.95) return 'ok';
  if (ratio >= 0.8) return 'near';
  return 'low';
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/**
 * Grupos del informe (Ejercicio, Calorías, Comidas) para un conjunto de días.
 * `elapsed` son los días del periodo que ya han pasado o están en curso: un
 * día futuro no cuenta como "no registrado". `ongoing` marca el periodo actual
 * (sus cifras aún pueden cambiar).
 */
export function buildReport(
  days: ProgressDay[],
  profile: RitmoProfile | null,
  elapsed: number,
  ongoing: boolean,
): ReportGroup[] {
  const logged = days.filter((d) => d.mealsLogged > 0);
  const sessions = days.reduce((s, d) => s + d.sessions, 0);
  const minutes = days.reduce((s, d) => s + d.activeMinutes, 0);
  const burned = days.reduce((s, d) => s + d.kcalBurned, 0);
  const tdee = profile?.tdeeKcal ?? null;

  const intakeAvg = avg(logged.map((d) => d.kcalIn));
  const targetAvg = avg(logged.map((d) => d.kcalTarget).filter((t): t is number => t !== null));
  const balanceAvg = tdee !== null ? avg(logged.map((d) => d.kcalIn - (tdee + d.kcalBurned))) : null;
  const balanceGoal = tdee !== null && targetAvg !== null ? targetAvg - tdee : null;

  const fullDays = days.filter((d) => d.mealsLogged >= 3).length;
  const proteinTarget = profile?.proteinTargetG ?? null;
  const proteinDays = proteinTarget ? days.filter((d) => d.proteinG >= proteinTarget).length : 0;

  const pendingOr = (s: Status) => (ongoing && s !== 'ok' ? 'pending' : s);

  const calorie: ReportItem[] = [];
  if (intakeAvg !== null && targetAvg !== null) {
    const ratio = 1 - Math.abs(intakeAvg - targetAvg) / targetAvg;
    calorie.push({
      label: elapsed === 1 ? 'Ingeridas' : 'Media ingerida',
      value: `${formatKcal(intakeAvg)} kcal`,
      target: `obj. ${formatKcal(targetAvg)}`,
      pct: Math.min(100, Math.round((intakeAvg / targetAvg) * 100)),
      status: pendingOr(statusFor(ratio)),
    });
  }
  if (balanceAvg !== null && balanceGoal !== null) {
    const off = Math.abs(balanceAvg - balanceGoal);
    calorie.push({
      label: 'Balance medio',
      value: `${balanceAvg > 0 ? '+' : ''}${formatNumber(Math.round(balanceAvg / 10) * 10)}`,
      target: `obj. ${balanceGoal > 0 ? '+' : ''}${formatNumber(Math.round(balanceGoal / 10) * 10)}`,
      pct: Math.max(0, Math.min(100, Math.round(100 - (off / 500) * 100))),
      status: pendingOr(off <= 100 ? 'ok' : off <= 250 ? 'near' : 'low'),
    });
  }

  return [
    {
      title: 'Ejercicio',
      items: [
        { label: 'Entrenos', value: `${sessions}`, target: 'sin plan aún', pct: Math.min(100, sessions * 20), status: 'pending' },
        { label: 'Tiempo entrenado', value: minutes ? formatDuration(minutes * 60) : '0 min', target: 'sin plan aún', pct: Math.min(100, minutes / 3), status: 'pending' },
        { label: 'Kcal de entreno', value: formatKcal(burned), target: 'sin plan aún', pct: Math.min(100, burned / 30), status: 'pending' },
      ],
    },
    { title: 'Calorías', items: calorie },
    {
      title: 'Comidas',
      items: [
        {
          label: 'Días registrados',
          value: `${fullDays} de ${elapsed}`,
          target: 'obj. todos',
          pct: Math.round((fullDays / Math.max(1, elapsed)) * 100),
          status: pendingOr(statusFor(fullDays / Math.max(1, elapsed))),
        },
        ...(proteinTarget
          ? [
              {
                label: 'Proteína en objetivo',
                value: `${proteinDays} de ${elapsed} ${elapsed === 1 ? 'día' : 'días'}`,
                target: `obj. ${proteinTarget} g`,
                pct: Math.round((proteinDays / Math.max(1, elapsed)) * 100),
                status: pendingOr(statusFor(proteinDays / Math.max(1, elapsed))),
              } satisfies ReportItem,
            ]
          : []),
      ],
    },
  ];
}
