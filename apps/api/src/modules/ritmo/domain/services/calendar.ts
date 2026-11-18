// Resolución de "día natural" del usuario. Dominio puro.
//
// Importa porque una comida registrada a las 00:30 en Madrid pertenece al día
// anterior en UTC: si se agrupara por UTC, el diario de la app mostraría la
// cena en el día siguiente. `Intl` ya conoce los husos y el horario de verano,
// así que no hace falta una librería de fechas.

/** Día natural (`YYYY-MM-DD`) al que pertenece un instante en esa zona. */
export function dayInTimezone(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    // Timezone inválida en el perfil: no es motivo para tumbar el registro.
    return instant.toISOString().slice(0, 10);
  }
}

/** Resta días a un día natural, sin pasar por husos horarios. */
export function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Minutos que la zona va por delante de UTC en ese instante (120 en verano en Madrid). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    n('year'),
    n('month') - 1,
    n('day'),
    n('hour'),
    n('minute'),
    n('second'),
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Instante de una hora de reloj local en esa zona ("17 nov 2026, 07:12" en
 * Madrid → 06:12Z). Tiene en cuenta el horario de verano. Con una zona
 * inválida, trata la hora como UTC.
 */
export function zonedTimeToUtc(
  local: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
): Date {
  const guess = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  try {
    const first = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
    // Segunda pasada por si el primer intento cae al otro lado de un cambio de hora.
    return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60000);
  } catch {
    return new Date(guess);
  }
}
