import type { MealType } from './api';

/**
 * Formateo de los datos de Brío para pantalla. Funciones puras y testeadas:
 * el redondeo de kcal y la etiqueta de día aparecen en varias pantallas y una
 * incoherencia entre ellas se ve a simple vista.
 */

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Comida',
  DINNER: 'Cena',
  SNACK: 'Merienda',
};

/** Orden en que se pintan las comidas del día: el del reloj, no el alfabético. */
export const MEAL_ORDER: MealType[] = [
  'BREAKFAST',
  'LUNCH',
  'SNACK',
  'DINNER',
];

/** Hora habitual de cada comida, para ordenar "Tu día" y decir "a las 21:00". */
export const MEAL_HOUR: Record<MealType, string> = {
  BREAKFAST: '8:00',
  LUNCH: '14:00',
  SNACK: '17:30',
  DINNER: '21:00',
};

/** Hora "H:MM" en una zona horaria (las horas de los entrenos). */
export function timeIn(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

/** Hora actual "H:MM" en una zona horaria. */
export function nowIn(timezone: string): string {
  return timeIn(new Date().toISOString(), timezone);
}

/** Hora del día (0–23) en una zona horaria. */
export function hourIn(timezone: string): number {
  try {
    return Number(
      new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).format(new Date()),
    );
  } catch {
    return new Date().getHours();
  }
}

/**
 * Lista de nombres en español: "A", "A y B", "A, B y C". La primera en
 * mayúscula y el resto en minúscula, como se diría ("Huevo entero y pan").
 */
export function joinNames(names: string[]): string {
  const parts = names.map((n, i) => (i === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1)));
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

export function mealLabel(type: MealType): string {
  return MEAL_LABELS[type];
}

/**
 * La comida más probable a una hora del día: es la que se preselecciona al
 * registrar desde el botón +, para que lo normal sea un toque menos.
 */
export function mealForHour(hour: number): MealType {
  if (hour < 11) return 'BREAKFAST';
  if (hour < 16) return 'LUNCH';
  if (hour < 19) return 'SNACK';
  return 'DINNER';
}

/**
 * Número con el formato del DS de Brío: punto de millar y coma decimal
 * (`1.240`, `74,2`) y menos tipográfico (`−0,4`). A mano y no con
 * `Intl('es-ES')`, porque esa localización no agrupa los números de cuatro
 * cifras ("1240") y el DS los quiere siempre agrupados.
 */
export function formatNumber(value: number, decimals = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = negative && Number(fixed) !== 0 ? '\u2212' : '';
  return `${sign}${grouped}${dec ? `,${dec}` : ''}`;
}

/** kcal siempre enteras: medio kcal no significa nada para el usuario. */
export function formatKcal(value: number): string {
  return formatNumber(Math.round(value));
}

/** Gramos con un decimal como máximo, y sin el `,0` cuando es redondo. */
export function formatGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1)} g`;
}

export function formatWeight(value: number): string {
  return `${formatNumber(Math.round(value * 10) / 10, 1)} kg`;
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
  return `${formatNumber(Math.round(meters / 100) / 10, 1)} km`;
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

/**
 * Fecha completa para el kicker de la cabecera: "miércoles, 11 de noviembre".
 * Se formatea a mediodía UTC del día para que ningún huso lo mueva de fecha.
 */
export function longDate(day: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));
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
