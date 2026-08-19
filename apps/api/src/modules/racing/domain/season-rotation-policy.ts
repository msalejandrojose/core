import { Season } from './entities/season.entity';

// Cuánto dura una temporada antes de rotar sola (TASK-228). Constante fija a
// propósito — nada en el producto pide todavía que sea configurable por
// circuito ni por campaña, y una temporada de duración variable complicaría
// la clasificación sin que nadie lo haya pedido.
export const SEASON_DURATION_DAYS = 30;

// Verdad si `season` sigue abierta pero ya ha corrido más de
// `SEASON_DURATION_DAYS` desde que empezó — el scheduler la cierra y abre la
// siguiente. Una temporada ya cerrada nunca "necesita" rotar: eso ya pasó.
export function seasonNeedsRotation(season: Season, now: Date): boolean {
  if (!season.isOpen()) return false;
  const dueAt = new Date(season.startsAt);
  dueAt.setUTCDate(dueAt.getUTCDate() + SEASON_DURATION_DAYS);
  return now >= dueAt;
}

// Nombre de la siguiente temporada a partir de la anterior: "Temporada 3" →
// "Temporada 4". Sin temporada previa, o con un nombre que no sigue el
// patrón (alguien la creó a mano con otro nombre), empieza de nuevo en
// "Temporada 1" — mejor un nombre plausible que uno raro tipo "Temporada
// NaN".
export function nextSeasonName(previous: Season | null): string {
  if (previous === null) return 'Temporada 1';

  const match = /^Temporada (\d+)$/.exec(previous.name);
  if (!match) return 'Temporada 1';

  return `Temporada ${Number(match[1]) + 1}`;
}
