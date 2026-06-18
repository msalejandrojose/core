// Parsea una duración del DSL (`"1d"`, `"30m"`, `"45s"`, `"2h"`, `"1w"`) o un
// número de segundos a segundos. Puro, sin deps. Lanza si es inválida.

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

export function parseDurationSeconds(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) {
      throw new Error(`Duración inválida: ${input}`);
    }
    return Math.floor(input);
  }
  const match = /^(\d+)\s*(s|m|h|d|w)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Duración inválida: "${input}". Usa <n>(s|m|h|d|w).`);
  }
  return parseInt(match[1], 10) * UNIT_SECONDS[match[2]];
}

export function isValidDuration(input: string | number): boolean {
  try {
    parseDurationSeconds(input);
    return true;
  } catch {
    return false;
  }
}
