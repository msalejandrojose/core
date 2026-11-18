import type { Exercise } from '../performance/perf.api';

/** Minúsculas y sin tildes, para buscar «press frances» o «buenos dias». */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Ejercicios que encajan con la búsqueda: primero los que la tienen en el
 * nombre y después los que solo la mencionan en la descripción (así «buenos
 * días» encuentra el good morning).
 */
export function searchExercises(list: Exercise[], query: string): Exercise[] {
  const q = fold(query);
  if (!q) return list;
  const byName = list.filter((e) => fold(e.name).includes(q));
  const byText = list.filter((e) => !byName.includes(e) && !!e.description && fold(e.description).includes(q));
  return [...byName, ...byText];
}
