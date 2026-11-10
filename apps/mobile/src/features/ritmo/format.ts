import type { MealType } from './api';

/**
 * Formateo de los datos de Ritmo para pantalla. Funciones puras y testeadas:
 * el redondeo de kcal y la etiqueta de día aparecen en varias pantallas y una
 * incoherencia entre ellas se ve a simple vista.
 */

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Comida',
  DINNER: 'Cena',
  SNACK: 'Snacks',
};

/** Orden en que se pintan las comidas del día (no el alfabético). */
export const MEAL_ORDER: MealType[] = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
];

export function mealLabel(type: MealType): string {
  return MEAL_LABELS[type];
}

/** kcal siempre enteras: medio kcal no significa nada para el usuario. */
export function formatKcal(value: number): string {
  return `${Math.round(value)}`;
}

/** Gramos con un decimal como máximo, y sin el `.0` cuando es redondo. */
export function formatGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} g` : `${rounded.toFixed(1)} g`;
}

export function formatWeight(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} kg`;
}

/** Duración humana: `45 min`, `1 h 20 min`, `2 h`. */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(Math.round(seconds / 60), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(Math.round(meters / 100) / 10).toFixed(1)} km`;
}

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * Etiqueta de un día del diario: "Hoy" / "Ayer" / "8 nov". Se compara contra
 * `today` recibido como parámetro (no `new Date()` dentro) para que sea
 * testeable y para que la pantalla pueda pasar el día del perfil.
 */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Hoy';
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (day === yesterday.toISOString().slice(0, 10)) return 'Ayer';

  const [, month, dayOfMonth] = day.split('-');
  return `${Number(dayOfMonth)} ${MONTHS[Number(month) - 1]}`;
}

/** Día natural de hoy en una zona horaria, igual que hace la API. */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Porcentaje de consumo sobre un objetivo, acotado a [0, 1] para pintar
 * barras/anillos. Sin objetivo devuelve 0: no se dibuja progreso inventado.
 */
export function ratio(value: number, target: number | null): number {
  if (!target || target <= 0) return 0;
  return Math.min(Math.max(value / target, 0), 1);
}
