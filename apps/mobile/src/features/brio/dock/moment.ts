import type { MealType } from '../api';
import { mealForHour } from '../format';

/** Lo que toca ahora, para la píldora que flota sobre la barra. */
export type Moment =
  | { kind: 'workout'; title: string; time: string | null }
  | { kind: 'weigh' }
  | { kind: 'meal'; meal: MealType };

export interface MomentInput {
  now: Date;
  /** Entreno planificado hoy, si lo hay y no está hecho ni saltado. */
  planned: { title: string; startTime: string | null } | null;
  /** Comidas ya apuntadas hoy. */
  mealsLogged: readonly MealType[];
  weighedToday: boolean;
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Prioridad: el entreno de hoy cuando se acerca su hora (o por la tarde si no
 * tiene hora), pesarse por la mañana y, si no, la comida del momento que falte.
 * `null` si no hay nada pendiente.
 */
export function currentMoment(input: MomentInput): Moment | null {
  const now = input.now.getHours() * 60 + input.now.getMinutes();
  if (input.planned) {
    const start = input.planned.startTime ? minutes(input.planned.startTime) : null;
    const near = start === null ? now >= 16 * 60 && now < 22 * 60 : now >= start - 90 && now <= start + 120;
    if (near) return { kind: 'workout', title: input.planned.title, time: input.planned.startTime };
  }
  if (!input.weighedToday && now >= 6 * 60 && now < 11 * 60) return { kind: 'weigh' };
  const meal = mealForHour(input.now.getHours());
  if (!input.mealsLogged.includes(meal)) return { kind: 'meal', meal };
  return null;
}
