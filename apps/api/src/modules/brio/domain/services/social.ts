/**
 * Social: reglas sin base de datos. Dos personas son AMIGAS cuando se siguen
 * mutuamente; solo entonces una ve lo que la otra comparte (entrenos y
 * objetivos, nunca peso ni comidas).
 */

export type ChallengeKind = 'SESSIONS' | 'KM' | 'STEPS' | 'LOGGING';
export const CHALLENGE_KINDS: readonly ChallengeKind[] = [
  'SESSIONS',
  'KM',
  'STEPS',
  'LOGGING',
];
export const CHALLENGE_WEEKS = [1, 2, 4] as const;

/** Nombre de usuario válido: 3–30 caracteres, minúsculas, números, punto o guion bajo. */
export const HANDLE_PATTERN = /^[a-z0-9._]{3,30}$/;

/** Base para un nombre de usuario a partir del nombre o del correo. */
export function handleBase(
  firstName: string | null,
  lastName: string | null,
  email: string,
): string {
  const source =
    [firstName, lastName].filter(Boolean).join('') || email.split('@')[0];
  const clean = source
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 20);
  return clean.length >= 3 ? clean : `brio${clean}`;
}

/** Nombre visible: nombre y apellido, o la parte del correo antes de la arroba. */
export function displayName(
  firstName: string | null,
  lastName: string | null,
  handle: string,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || handle;
}

export type Relation = 'SELF' | 'FRIENDS' | 'FOLLOWING' | 'FOLLOWS_ME' | 'NONE';

export function relationOf(
  isSelf: boolean,
  iFollow: boolean,
  followsMe: boolean,
): Relation {
  if (isSelf) return 'SELF';
  if (iFollow && followsMe) return 'FRIENDS';
  if (iFollow) return 'FOLLOWING';
  return followsMe ? 'FOLLOWS_ME' : 'NONE';
}

/** Solo se ve la actividad de alguien si sois amigos y esa persona comparte. */
export const canSeeActivity = (relation: Relation, shareActivity: boolean) =>
  relation === 'SELF' || (relation === 'FRIENDS' && shareActivity);

export interface SessionFact {
  id: string;
  userId: string;
  startedAt: Date;
  day: string;
  typeName: string;
  kind: string;
  durationSec: number;
  distanceM: number | null;
}

export interface FeedEvent {
  /** Clave estable para dar ánimo: `s:<id de sesión>`. */
  key: string;
  userId: string;
  at: string;
  text: string;
  badge: string;
  /** `pr` = marca personal; `goal` = entreno hecho. */
  kind: 'goal' | 'pr';
}

const km = (m: number) => (m / 1000).toFixed(1).replace('.', ',');
function minutes(sec: number): string {
  const m = Math.round(sec / 60);
  return m >= 60
    ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
    : `${m} min`;
}

/**
 * Un entreno contado como logro. Es marca personal si supera la distancia más
 * larga que esa persona tenía en ese tipo de actividad (`previousBestM`).
 */
export function eventFrom(
  s: SessionFact,
  previousBestM: number | null,
): FeedEvent {
  const isRecord =
    !!s.distanceM &&
    s.distanceM >= 3000 &&
    previousBestM !== null &&
    s.distanceM > previousBestM;
  const what = s.distanceM
    ? `${s.typeName} de ${km(s.distanceM)} km en ${minutes(s.durationSec)}`
    : `${s.typeName} · ${minutes(s.durationSec)}`;
  return {
    key: `s:${s.id}`,
    userId: s.userId,
    at: s.startedAt.toISOString(),
    text: isRecord
      ? `${what}. Su distancia más larga hasta ahora.`
      : `${what}.`,
    badge: isRecord ? 'Récord' : s.typeName,
    kind: isRecord ? 'pr' : 'goal',
  };
}

const shift = (day: string, delta: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Días seguidos con entreno hasta hoy (o hasta ayer, si hoy aún no ha entrenado). */
export function streakDays(
  activeDays: Iterable<string>,
  today: string,
): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : shift(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor = shift(cursor, -1);
  }
  return n;
}

export interface RankingEntry {
  userId: string;
  value: number;
  position: number;
}

/** Clasificación de mayor a menor; los empatados comparten puesto. */
export function rank(
  values: { userId: string; value: number }[],
): RankingEntry[] {
  const sorted = [...values].sort(
    (a, b) => b.value - a.value || a.userId.localeCompare(b.userId),
  );
  let position = 0;
  let last: number | null = null;
  return sorted.map((v, i) => {
    if (v.value !== last) {
      position = i + 1;
      last = v.value;
    }
    return { ...v, position };
  });
}

/** Último día de un reto de `weeks` semanas que empieza en `start` (incluido). */
export const challengeEnd = (start: string, weeks: number) =>
  shift(start, weeks * 7 - 1);

/** Días que quedan de un reto, contando hoy; 0 si ya terminó. */
export function daysLeft(endDay: string, today: string): number {
  const diff = Math.round(
    (Date.parse(`${endDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
  return Math.max(0, diff + 1);
}
