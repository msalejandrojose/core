import { call, isApiError } from '../api';

/** Contrato de `/brio/social`. Solo se comparten entrenos y objetivos; nunca peso ni comidas. */

export type Relation = 'SELF' | 'FRIENDS' | 'FOLLOWING' | 'FOLLOWS_ME' | 'NONE';
export type ChallengeKind = 'SESSIONS' | 'KM' | 'STEPS' | 'LOGGING';

export interface Me {
  id: string;
  name: string;
  handle: string;
  shareActivity: boolean;
}

export interface Person {
  id: string;
  name: string;
  handle: string;
  relation: Relation;
  sessionsThisWeek: number | null;
  kmThisWeek: number | null;
}

export interface People {
  friends: Person[];
  pending: Person[];
  followers: Person[];
}

export interface FeedItem {
  key: string;
  userId: string;
  at: string;
  text: string;
  badge: string;
  kind: 'goal' | 'pr';
  name: string;
  handle: string;
  cheers: number;
  cheered: boolean;
}

export interface PersonProfile extends Person {
  visible: boolean;
  streakDays: number | null;
  goal: { name: string; raceDate: string | null; daysToRace: number | null } | null;
  events: FeedItem[];
}

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  startDay: string;
  endDay: string;
  daysLeft: number;
  finished: boolean;
  mine: boolean;
  ranking: { userId: string; name: string; me: boolean; value: number; position: number }[];
  cheers: number;
  cheered: boolean;
}

export const socialApi = {
  me: () => call<Me>('GET', '/brio/social/me'),
  updateMe: (body: { handle?: string; shareActivity?: boolean }) => call<Me>('PUT', '/brio/social/me', { body }),
  people: () => call<People>('GET', '/brio/social/people'),
  search: (q: string) => call<{ results: Person[] }>('GET', '/brio/social/people', { params: { query: { q } } }),
  person: (id: string) => call<PersonProfile>('GET', `/brio/social/people/${id}`),
  follow: (id: string) => call<Person>('PUT', `/brio/social/follows/${id}`),
  unfollow: (id: string) => call<Person>('DELETE', `/brio/social/follows/${id}`),
  feed: () => call<FeedItem[]>('GET', '/brio/social/feed'),
  cheer: (key: string, on: boolean) => call<void>(on ? 'PUT' : 'DELETE', `/brio/social/cheers/${key}`),
  challenges: () => call<Challenge[]>('GET', '/brio/social/challenges'),
  createChallenge: (body: { kind: ChallengeKind; weeks: number; friendIds: string[] }) => call<Challenge>('POST', '/brio/social/challenges', { body }),
  leaveChallenge: (id: string) => call<void>('DELETE', `/brio/social/challenges/${id}`),
};

const ERROR_TEXT: Record<string, string> = {
  BRIO_SOCIAL_HANDLE_INVALID: 'El usuario debe tener entre 3 y 30 letras, números, puntos o guiones bajos.',
  BRIO_SOCIAL_HANDLE_TAKEN: 'Ese usuario ya está cogido.',
  BRIO_CHALLENGE_FRIENDS_ONLY: 'Solo puedes retar a amigos: personas que sigues y que te siguen.',
};
export function socialErrorText(e: unknown): string | undefined {
  if (!isApiError(e)) return undefined;
  return ERROR_TEXT[e.code] ?? ERROR_TEXT[e.message] ?? e.message;
}

const COLORS = ['var(--brio-tint)', 'var(--brio-activity-ink)', 'var(--brio-food-ink)', 'var(--brio-sleep-ink)', 'var(--brio-heart-ink)', 'var(--brio-ink-2)'];
/** Color estable del avatar de una persona, a partir de su id. */
export function colorOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export const firstName = (name: string) => name.split(' ')[0];

/** "hace 2 h", "ayer", "martes"… */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'hace un momento';
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long' });
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** Resumen de la semana de un amigo, o qué falta para serlo. */
export function personMeta(p: Person): string {
  if (p.relation === 'FOLLOWING') return 'Aún no te sigue';
  if (p.relation === 'FOLLOWS_ME') return 'Te sigue';
  if (p.sessionsThisWeek === null) return `@${p.handle}`;
  const sessions = `${p.sessionsThisWeek} ${p.sessionsThisWeek === 1 ? 'sesión' : 'sesiones'} esta semana`;
  return p.kmThisWeek ? `${sessions} · ${String(p.kmThisWeek).replace('.', ',')} km` : sessions;
}

export const KIND_TEXT: Record<ChallengeKind, { label: string; desc: string; title: string; unit: string }> = {
  SESSIONS: { label: 'Más sesiones', desc: 'Gana quien más entrene', title: 'Más sesiones', unit: '' },
  KM: { label: 'Kilómetros', desc: 'Correr, andar o bici', title: 'Más kilómetros', unit: ' km' },
  STEPS: { label: 'Pasos', desc: 'Con reloj conectado', title: 'Más pasos', unit: '' },
  LOGGING: { label: 'Constancia', desc: 'Días registrando comidas', title: 'Más días registrando comidas', unit: ' días' },
};

/** Invitar: hoja nativa de compartir si existe; si no, copia el enlace. */
export async function invite(handle?: string): Promise<'shared' | 'copied' | 'none'> {
  const data = {
    title: 'Brío',
    text: handle ? `Entrena conmigo en Brío. Búscame como @${handle}` : 'Entrena conmigo en Brío',
    url: window.location.origin,
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return 'shared';
    }
    await navigator.clipboard.writeText(`${data.text}: ${data.url}`);
    return 'copied';
  } catch {
    return 'none';
  }
}
