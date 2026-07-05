// Coerción segura de un campo de contenido (tipado `unknown`) a string. El
// contenido ya viene renderizado y validado; esto solo satisface al tipado.
export function contentField(value: unknown): string {
  if (value == null) return '';
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    default:
      return JSON.stringify(value) ?? '';
  }
}
