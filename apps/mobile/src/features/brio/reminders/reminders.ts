import type { MealType } from '../api';
import { formatKcal } from '../format';
import type { Kind } from '../pages/alert-prefs';

/**
 * Qué recordatorios tocan y cuándo. Puro: con lo que se sabe ahora (lo
 * registrado hoy, el plan de hoy y de mañana, las preferencias) devuelve los
 * avisos futuros. Se vuelve a calcular cada vez que algo cambia, así que si
 * apuntas la comida, el «¿te falta la comida?» desaparece.
 */

export interface ReminderSpec {
  /** Id fijo por tipo: reprogramar sustituye al anterior. */
  id: number;
  kind: Kind;
  at: Date;
  title: string;
  body: string;
}

export interface PlannedLite {
  title: string;
  startTime: string | null;
  load: 'REST' | 'LOW' | 'MEDIUM' | 'HIGH';
  done: boolean;
}

export interface ReminderInput {
  now: Date;
  on: Record<Kind, boolean>;
  loggedMeals: ReadonlySet<MealType>;
  kcalRemaining: number | null;
  today: PlannedLite | null;
  tomorrow: (PlannedLite & { dietKcal: number | null }) | null;
  /** Recuperación de hoy (0–100), si se conoce. */
  recovery: number | null;
}

export const REMINDER_IDS: Record<string, number> = {
  comidasTarde: 101,
  comidasNoche: 102,
  cena: 103,
  entreno: 104,
  sesion: 105,
  recup: 106,
  peso: 107,
  resumen: 108,
};
export const REST_END_ID = 900;

/** No molestar: de 23:00 a 7:30. */
export function inQuietHours(d: Date): boolean {
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= 23 * 60 || m < 7 * 60 + 30;
}

const at = (base: Date, h: number, min = 0, addDays = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(h, min, 0, 0);
  return d;
};

/** Próximo día de la semana (0 = domingo) a esa hora, hoy incluido si aún no ha pasado. */
function nextWeekday(now: Date, weekday: number, h: number, min = 0): Date {
  const diff = (weekday - now.getDay() + 7) % 7;
  const d = at(now, h, min, diff);
  return d > now ? d : at(now, h, min, diff + 7);
}

const parseHM = (t: string | null) => {
  const m = t ? /^(\d{1,2}):(\d{2})$/.exec(t) : null;
  return m ? { h: Number(m[1]), min: Number(m[2]) } : null;
};

const MEAL_NAME: Record<MealType, string> = {
  BREAKFAST: 'el desayuno',
  LUNCH: 'la comida',
  SNACK: 'la merienda',
  DINNER: 'la cena',
};

function missingText(types: MealType[]): string {
  const names = types.map((t) => MEAL_NAME[t]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

export function planReminders(input: ReminderInput): ReminderSpec[] {
  const { now, on } = input;
  const out: ReminderSpec[] = [];
  const add = (id: number, kind: Kind, when: Date, title: string, body: string) => {
    if (when > now && !inQuietHours(when)) out.push({ id, kind, at: when, title, body });
  };

  if (on.comidas) {
    const morning = (['BREAKFAST', 'LUNCH'] as MealType[]).filter((t) => !input.loggedMeals.has(t));
    if (morning.length)
      add(REMINDER_IDS.comidasTarde, 'comidas', at(now, 16), `¿Te falta ${missingText(morning)}?`, 'Apúntala en un momento para que cuadren tus calorías.');
    const all = (['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as MealType[]).filter((t) => !input.loggedMeals.has(t));
    if (all.length)
      add(REMINDER_IDS.comidasNoche, 'comidas', at(now, 22), `Te falta ${missingText(all)}`, 'Antes de dormir: apunta lo que queda del día.');
  }

  if (on.cena && !input.loggedMeals.has('DINNER') && input.kcalRemaining !== null && input.kcalRemaining > 0) {
    const tomorrowHard = input.tomorrow && (input.tomorrow.load === 'HIGH' || input.tomorrow.load === 'MEDIUM');
    add(
      REMINDER_IDS.cena,
      'cena',
      at(now, 20, 30),
      `Te quedan ${formatKcal(input.kcalRemaining)} kcal para cenar`,
      tomorrowHard ? `Mañana toca ${input.tomorrow!.title}: mejor con hidratos.` : 'Toca para apuntar la cena.',
    );
  }

  const t = input.today;
  if (on.sesion && t && !t.done && t.load !== 'REST') {
    // Media hora antes de la hora prevista; sin hora, a las 18:00.
    const hm = parseHM(t.startTime);
    const when = hm ? new Date(at(now, hm.h, hm.min).getTime() - 30 * 60 * 1000) : at(now, 18);
    add(REMINDER_IDS.entreno, 'sesion', when, `Hoy toca ${t.title}`, hm ? `A las ${t.startTime}. ¡Dale!` : 'Aún estás a tiempo. ¡Dale!');
  }

  const tm = input.tomorrow;
  if (on.sesion && tm && tm.load !== 'REST') {
    const diet = tm.dietKcal ? ` · dieta de ${formatKcal(tm.dietKcal)} kcal` : '';
    add(REMINDER_IDS.sesion, 'sesion', at(now, 21), `Mañana: ${tm.title}${tm.startTime ? ` a las ${tm.startTime}` : ''}`, `Prepara la bolsa y duerme bien${diet}.`);
  }

  if (on.recup && input.recovery !== null && input.recovery < 50 && t && !t.done && t.load === 'HIGH') {
    // Si ya es de día, ahora (en un minuto); si es pronto, a las 8:00.
    const soon = new Date(now.getTime() + 60 * 1000);
    const when = soon < at(now, 8) ? at(now, 8) : soon;
    add(REMINDER_IDS.recup, 'recup', when, 'Tu recuperación está baja', `Hoy tienes ${t.title} con carga alta: piensa en suavizarla.`);
  }

  if (on.peso) add(REMINDER_IDS.peso, 'peso', nextWeekday(now, 1, 8), 'Toca pesarte', 'En ayunas y después del baño: apúntalo con el +.');
  if (on.resumen) add(REMINDER_IDS.resumen, 'resumen', nextWeekday(now, 0, 20), 'Tu semana en Brío', 'Mira cómo ha ido: entrenos, calorías y progreso.');

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
