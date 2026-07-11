import { ScoreBand } from './sentiment-band';

// La nota (0-10) de un SiteEntry nuevo se calcula como el punto medio entre
// las notas de sus dos vecinos en `sortedBest` (mejor y peor que él, según
// la posición que encontró insertion-stepper) — nunca a partir de una
// fórmula basada en el tamaño de la banda. Así queda garantizado que el
// nuevo score cae estrictamente entre sus vecinos y el orden global
// (`ORDER BY score DESC`) se mantiene correcto sin tener que re-calcular ni
// tocar el score de ningún SiteEntry existente.
//
// Precisión: se guarda con 3 decimales (no 1) para tener margen antes de
// que dos inserciones sucesivas en el mismo hueco puedan redondear al
// mismo valor. La UI redondea a 1 decimal solo al mostrarlo.
export function deriveScore(
  band: ScoreBand,
  upperNeighborScore: number | null, // score del vecino mejor (null si el nuevo sitio queda primero de la banda)
  lowerNeighborScore: number | null, // score del vecino peor (null si el nuevo sitio queda último de la banda)
): number {
  const upper = upperNeighborScore ?? band.max;
  const lower = lowerNeighborScore ?? band.min;
  return round3((upper + lower) / 2);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
