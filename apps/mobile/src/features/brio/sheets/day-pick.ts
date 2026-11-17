/**
 * Ayudas del selector «Cuándo» de los sheets de registro: qué días se
 * ofrecen, cómo se llaman y cómo se pasa una hora local a un instante.
 */

export function shiftIso(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Hoy y los `n − 1` días anteriores, del más reciente al más antiguo. */
export function recentDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftIso(today, -i));
}

/** «Hoy», «Ayer», «Lun 10» o, si es de otra semana, «10 nov». */
export function dayChipLabel(day: string, today: string): string {
  const diff = Math.round(
    (new Date(`${today}T12:00:00Z`).getTime() - new Date(`${day}T12:00:00Z`).getTime()) / 86_400_000,
  );
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  const d = new Date(`${day}T12:00:00Z`);
  if (diff > 1 && diff < 7) {
    const wd = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', '');
    return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getUTCDate()}`;
  }
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(d)
    .replace('.', '');
}

/** Minutos que la zona va por delante de UTC en ese instante. */
function offsetMin(utcMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - utcMs) / 60_000);
}

/**
 * Instante ISO de las `hhmm` de `day` en la zona del perfil (no la del
 * móvil): así un entreno «el martes a las 19:00» cae en ese martes aunque
 * estés de viaje.
 */
export function zonedIso(day: string, hhmm: string, timezone: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h || 0, mi || 0);
  try {
    let utc = guess - offsetMin(guess, timezone) * 60_000;
    // Segunda pasada por si el cambio de hora cae entre medias.
    utc = guess - offsetMin(utc, timezone) * 60_000;
    return new Date(utc).toISOString();
  } catch {
    return new Date(guess).toISOString();
  }
}
