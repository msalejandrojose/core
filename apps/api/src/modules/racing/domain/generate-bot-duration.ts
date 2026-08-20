// Cuánto se le hace variar al bot alrededor de un tiempo de referencia
// (TASK-323, tarea 5) — un cronómetro fijo se nota artificial al instante;
// con variación, a veces el bot gana, a veces no.
const VARIANCE = 0.12;

// Genera el tiempo de un rival ficticio a partir de un tiempo de
// referencia — normalmente la mejor marca de un jugador real de la sala en
// ese circuito, o el mínimo plausible del circuito si nadie tiene marca
// todavía (ver `pickBotReferenceMs` en el manager). `random` inyectable
// solo para tests deterministas — por defecto `Math.random`.
export function generateBotDuration(
  referenceMs: number,
  random: () => number = Math.random,
): number {
  const factor = 1 + (random() * 2 - 1) * VARIANCE;
  return Math.max(1, Math.round(referenceMs * factor));
}
