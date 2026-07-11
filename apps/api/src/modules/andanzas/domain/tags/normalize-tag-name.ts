// Normaliza el nombre de un tag antes de guardarlo o compararlo: recorta
// espacios, colapsa espacios múltiples y pasa a minúsculas. Mantiene tildes
// y ñ (son significativas en español). Dos entradas que normalizan igual
// ("Playa", " playa ", "PLAYA") se tratan como el mismo tag — al crear uno
// nuevo con un nombre que ya normaliza a un tag existente, se reutiliza ese
// tag (upsert) en vez de crear un duplicado.
export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}
