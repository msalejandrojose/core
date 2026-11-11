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
