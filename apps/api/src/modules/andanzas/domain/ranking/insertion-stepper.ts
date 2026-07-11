// Inserción asistida por comparaciones binarias (insertion sort asistido,
// tipo Beli): en vez de pedir una nota, se compara el sitio nuevo contra
// sitios ya puntuados de la misma banda de sentimiento hasta encontrar su
// posición exacta. `sortedBest` va del mejor (índice 0) al peor de esa
// banda. El caller no conoce el algoritmo por dentro: solo llama
// `nextStep`, muestra la comparación si hace falta, y llama `advance` con
// la respuesta hasta que `nextStep` devuelva `done: true`.
//
// Nº de comparaciones esperado: ceil(log2(n + 1)), n = tamaño de la banda.

export interface InsertionRange {
  lo: number;
  hi: number; // rango [lo, hi) sobre `sortedBest` donde puede caer el nuevo sitio
}

export type InsertionStep =
  | { done: false; compareIndex: number } // hay que comparar el nuevo sitio contra sortedBest[compareIndex]
  | { done: true; index: number }; // posición final: 0 = mejor de la banda

export function initialRange(sortedBestLength: number): InsertionRange {
  return { lo: 0, hi: sortedBestLength };
}

export function nextStep(range: InsertionRange): InsertionStep {
  const { lo, hi } = range;
  if (lo >= hi) return { done: true, index: lo };
  return { done: false, compareIndex: Math.floor((lo + hi) / 2) };
}

// `newSiteIsBetter`: true si el usuario dijo que el sitio nuevo le gustó
// más que `sortedBest[compareIndex]`.
export function advance(
  range: InsertionRange,
  compareIndex: number,
  newSiteIsBetter: boolean,
): InsertionRange {
  return newSiteIsBetter
    ? { lo: range.lo, hi: compareIndex }
    : { lo: compareIndex + 1, hi: range.hi };
}
