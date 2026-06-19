import type { DataField, Field } from '../types/field.ts';

/** ¿Es un campo que produce valor (tiene `name`)? */
export function isDataField(field: Field): field is DataField {
  return (
    field.type !== 'group' &&
    field.type !== 'heading' &&
    field.type !== 'divider'
  );
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
