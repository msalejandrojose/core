import { create } from 'zustand';

/**
 * Datos de ejemplo de Social (lienzo "Amigos", "Amigo", "Retos"). Aún no hay
 * backend de amigos ni de retos en Ritmo: todo esto se muestra con la etiqueta
 * «Ejemplo» y lo que tocas (seguir, dar ánimo) solo cambia en esta sesión.
 */

export interface Person {
  id: string;
  name: string;
  user: string;
  color: string;
  meta: string;
}

export const PEOPLE: Person[] = [
  { id: 'laura', name: 'Laura Gómez', user: '@laurag', color: 'var(--ritmo-tint)', meta: '4 sesiones esta semana' },
  { id: 'marcos', name: 'Marcos Ruiz', user: '@marcosruns', color: 'var(--ritmo-activity-ink)', meta: '3 sesiones · 32 km esta semana' },
  { id: 'carmen', name: 'Carmen Vidal', user: '@carmenv', color: 'var(--ritmo-food-ink)', meta: '5 sesiones esta semana' },
  { id: 'dani', name: 'Dani Ortega', user: '@daniort', color: 'var(--ritmo-sleep-ink)', meta: '2 sesiones esta semana' },
  { id: 'paula', name: 'Paula Serrano', user: '@paulafit', color: 'var(--ritmo-heart-ink)', meta: 'Amiga de Laura' },
  { id: 'sergio', name: 'Sergio León', user: '@sergiol', color: 'var(--ritmo-ink-2)', meta: 'En tus contactos' },
];

export const personById = (id: string): Person | undefined => PEOPLE.find((p) => p.id === id);

export interface FeedItem {
  id: string;
  who: string;
  when: string;
  text: string;
  badge: string;
  kind: 'goal' | 'pr';
  cheers: number;
}

export const FEED: FeedItem[] = [
  { id: 'f1', who: 'laura', when: 'hace 2 h', text: 'Ha cumplido su objetivo de pasos cinco días seguidos.', badge: '10.000 pasos', kind: 'goal', cheers: 6 },
  { id: 'f2', who: 'marcos', when: 'ayer', text: 'Tirada larga de 18 km a 5:12/km. Su distancia más larga hasta ahora.', badge: 'Récord', kind: 'pr', cheers: 11 },
  { id: 'f3', who: 'carmen', when: 'ayer', text: 'Ha llegado a su objetivo de peso.', badge: 'Objetivo cumplido', kind: 'goal', cheers: 14 },
  { id: 'f4', who: 'dani', when: 'martes', text: 'Nueva marca en sentadilla: 5 × 100 kg.', badge: 'Récord · Hevy', kind: 'pr', cheers: 4 },
  { id: 'f5', who: 'laura', when: 'lunes', text: 'Semana completa: 6 de 6 sesiones.', badge: 'Semana perfecta', kind: 'goal', cheers: 9 },
];

interface SocialState {
  follow: Record<string, boolean>;
  cheered: Record<string, boolean>;
  toggleFollow: (id: string) => void;
  toggleCheer: (id: string) => void;
}

export const useSocialStore = create<SocialState>()((set) => ({
  follow: { laura: true, marcos: true, carmen: true, dani: true, paula: false, sergio: false },
  cheered: { f2: true },
  toggleFollow: (id) => set((s) => ({ follow: { ...s.follow, [id]: !s.follow[id] } })),
  toggleCheer: (id) => set((s) => ({ cheered: { ...s.cheered, [id]: !s.cheered[id] } })),
}));

/** Invitar: hoja nativa de compartir si existe; si no, copia el enlace. */
export async function invite(): Promise<'shared' | 'copied' | 'none'> {
  const data = { title: 'Ritmo', text: 'Entrena conmigo en Ritmo', url: window.location.origin };
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
