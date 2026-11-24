import type { PlanTemplate, WeekSlot } from './plan.api';

/** Días de la semana tipo, de lunes (1) a domingo (7). */
export const WEEKDAYS = [
  { n: 1, letter: 'L', name: 'Lunes' },
  { n: 2, letter: 'M', name: 'Martes' },
  { n: 3, letter: 'X', name: 'Miércoles' },
  { n: 4, letter: 'J', name: 'Jueves' },
  { n: 5, letter: 'V', name: 'Viernes' },
  { n: 6, letter: 'S', name: 'Sábado' },
  { n: 7, letter: 'D', name: 'Domingo' },
] as const;

/** Lo primero que se ofrece: lo que más se repite cada semana. */
const FIRST = ['futsal', 'f7', 'futbol', 'gym', 'padel'];

/** Plantillas para la semana tipo, con los deportes primero y sin «Descanso». */
export function slotChoices(templates: PlanTemplate[]): PlanTemplate[] {
  const pick = templates.filter((t) => t.load !== 'REST');
  const rank = (t: PlanTemplate) => {
    const i = FIRST.indexOf(t.code);
    return i === -1 ? FIRST.length : i;
  };
  return [...pick].sort((a, b) => rank(a) - rank(b));
}

/** Una fila por cada día elegido; mismo deporte, hora, duración y rutina. */
export function addSlots(
  slots: WeekSlot[],
  days: number[],
  base: Omit<WeekSlot, 'weekday'>,
): WeekSlot[] {
  const added = days.map((weekday) => ({ ...base, weekday }));
  return [...slots, ...added].sort(
    (a, b) => a.weekday - b.weekday || (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'),
  );
}

/** «Fútbol sala · 21:00 · 60′». */
export function slotLabel(slot: WeekSlot, templates: PlanTemplate[]): { title: string; meta: string } {
  const t = templates.find((x) => x.code === slot.templateCode);
  const minutes = slot.durationMin ?? t?.durationMin ?? null;
  const meta = [slot.startTime, minutes ? `${minutes}′` : null, slot.title && t ? t.title : null]
    .filter(Boolean)
    .join(' · ');
  return { title: slot.title ?? t?.title ?? slot.templateCode, meta };
}
