import { Sort, SortDirection } from '../pagination.types';

const SORT_REGEX = /^([a-zA-Z_][a-zA-Z0-9_]*):(asc|desc)$/;

/**
 * Parsea un parámetro `sort` con formato `field:asc` o `field:desc`. El
 * caller (use case) es responsable de validar que `field` está en su
 * whitelist de columnas ordenables; aquí solo se valida la forma sintáctica.
 *
 * @returns el `Sort` parseado, o `null` si la cadena no cumple el formato.
 */
export function parseSort(raw: string | undefined | null): Sort | null {
  if (!raw) {
    return null;
  }
  const match = SORT_REGEX.exec(raw);
  if (!match) {
    return null;
  }
  return {
    field: match[1],
    direction: match[2] as SortDirection,
  };
}
