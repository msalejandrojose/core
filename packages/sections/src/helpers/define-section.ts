import type { DefineSectionsArgs, SectionInput } from '../types.js';

/**
 * Helper de autoría tipada. Devuelve el árbol tal cual, sin transformarlo —
 * el backend se encarga de persistirlo. Su valor está en bloquear errores de
 * tipo en tiempo de compilación al declarar el catálogo inicial.
 */
export function defineSection(args: DefineSectionsArgs): DefineSectionsArgs {
  return args;
}

export type { SectionInput };
