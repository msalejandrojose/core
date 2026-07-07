import type { DataField, Field } from '../types/field.ts';

/** Tipos estructurales / de UI que NO producen valor (no tienen `name`). */
const NON_DATA_TYPES = new Set(['group', 'heading', 'paragraph', 'divider']);

/** ¿Es un campo que produce valor (tiene `name`)? */
export function isDataField(field: Field): field is DataField {
  return !NON_DATA_TYPES.has(field.type);
}

/**
 * Recorre el árbol de campos en orden, entrando en los grupos. Como los grupos
 * son solo presentacionales, sus hijos se aplanan al mismo nivel.
 */
export function collectDataFields(fields: readonly Field[]): DataField[] {
  const out: DataField[] = [];
  for (const field of fields) {
    if (field.type === 'group') {
      out.push(...collectDataFields(field.fields));
    } else if (isDataField(field)) {
      out.push(field);
    }
  }
  return out;
}

/** Busca un campo de datos por su `name` en todo el árbol. */
export function findDataField(
  fields: readonly Field[],
  name: string,
): DataField | undefined {
  return collectDataFields(fields).find((f) => f.name === name);
}
