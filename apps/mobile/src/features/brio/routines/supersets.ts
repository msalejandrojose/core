/**
 * Superseries: ejercicios seguidos con el mismo número de grupo. Mismas reglas
 * que la API (solo seguidos, de dos o más, numerados desde 1).
 */

export const REST_OPTIONS = [0, 30, 60, 90, 120, 180] as const;

export const restLabel = (sec: number | null) =>
  !sec ? 'Sin descanso' : sec < 60 ? `${sec} s` : sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec / 60} min`;

export function normalizeGroups(groups: (number | null | undefined)[]): (number | null)[] {
  const out: (number | null)[] = groups.map(() => null);
  let next = 1;
  let i = 0;
  while (i < groups.length) {
    const g = groups[i];
    let j = i + 1;
    if (g != null) while (j < groups.length && groups[j] === g) j += 1;
    if (g != null && j - i >= 2) {
      for (let k = i; k < j; k += 1) out[k] = next;
      next += 1;
    }
    i = j;
  }
  return out;
}

/**
 * Une el ejercicio `i` con el siguiente en superserie o, si ya lo estaban,
 * los separa por ahí. Devuelve los grupos nuevos (normalizados).
 */
export function toggleLink(groups: (number | null)[], i: number): (number | null)[] {
  if (i < 0 || i >= groups.length - 1) return normalizeGroups(groups);
  const next = [...groups];
  const a = next[i];
  const b = next[i + 1];
  if (a != null && a === b) {
    // Separar: lo que viene después pasa a un grupo nuevo.
    const fresh = Math.max(0, ...next.map((g) => g ?? 0)) + 1;
    for (let k = i + 1; k < next.length && groups[k] === a; k += 1) next[k] = fresh;
  } else {
    const g = a ?? b ?? Math.max(0, ...next.map((x) => x ?? 0)) + 1;
    const old = b;
    next[i] = g;
    // El siguiente (y su grupo, si tenía) se suman.
    for (let k = i + 1; k < next.length && (k === i + 1 || (old != null && groups[k] === old)); k += 1) next[k] = g;
  }
  return normalizeGroups(next);
}

export const linkedWithNext = (groups: (number | null)[], i: number) =>
  groups[i] != null && groups[i] === groups[i + 1];

/** «A», «B»… para nombrar cada superserie. */
export const supersetLetter = (group: number) => String.fromCharCode(64 + group);

/** ¿Es el último ejercicio de su superserie (o va suelto)? Ahí toca descansar. */
export const closesRound = (groups: (number | null)[], i: number) => groups[i] == null || groups[i + 1] !== groups[i];
