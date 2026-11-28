/**
 * Enlaces `brio://…` con los que los widgets abren la app en su sitio:
 *   brio://hoy                → Hoy
 *   brio://entreno[?routine=] → empezar el entreno de hoy (o volver al que está en curso)
 *   brio://plan               → el plan de la semana
 *   brio://registrar[/comida|/entreno|/peso] → «Registrar» (acción rápida), o directa a esa hoja
 * Puro: decide a dónde ir; el hook lo ejecuta.
 */
export type QuickSheet = 'menu' | 'meal' | 'activity' | 'weight';

export type DeepLink =
  | { kind: 'route'; path: string }
  | { kind: 'start-workout'; routineId: string | null }
  | { kind: 'register'; sheet: QuickSheet };

const QUICK: Record<string, QuickSheet> = { comida: 'meal', entreno: 'activity', peso: 'weight' };

export function parseDeepLink(url: string): DeepLink | null {
  const m = /^brio:\/\/([^/?#]+)(?:\/([^?#]*))?(?:\?([^#]*))?/i.exec(url.trim());
  if (!m) return null;
  const params = new URLSearchParams(m[3] ?? '');
  switch (m[1].toLowerCase()) {
    case 'hoy':
      return { kind: 'route', path: '/tabs/today' };
    case 'plan':
      return { kind: 'route', path: '/tabs/entrenos/plan' };
    case 'entreno':
      return { kind: 'start-workout', routineId: params.get('routine') || null };
    case 'registrar':
      return { kind: 'register', sheet: QUICK[(m[2] ?? '').toLowerCase().replace(/\/+$/, '')] ?? 'menu' };
    default:
      return { kind: 'route', path: '/tabs/today' };
  }
}
