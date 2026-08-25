// Verdad si la última rotación fue en un día de calendario (UTC) distinto
// del de `now`, o si todavía no ha rotado nunca — mismo criterio que
// `seasonNeedsRotation`, pero por día en vez de por `SEASON_DURATION_DAYS`.
export function circuitRotationNeedsRotation(
  lastRotatedAt: Date | null,
  now: Date,
): boolean {
  if (lastRotatedAt === null) return true;
  return toUtcDateKey(lastRotatedAt) !== toUtcDateKey(now);
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Elige al azar hasta `count` ids de entre los candidatos, sin repetir —
// Fisher-Yates parcial. `random` inyectable solo para tests deterministas,
// por defecto `Math.random` (mismo patrón que `generateBotDuration`). Si
// `count` es mayor o igual que el nº de candidatos, los devuelve todos.
export function selectCircuitsForRotation(
  candidateIds: readonly string[],
  count: number,
  random: () => number = Math.random,
): string[] {
  const pool = [...candidateIds];
  const take = Math.min(Math.max(0, count), pool.length);

  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, take);
}
