/**
 * Tipos JSON. Todo el schema de un formulario debe ser serializable a JSON
 * (sin `Function` ni `Symbol`) para poder viajar cliente ↔ backend ↔ BD.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Clave de traducción. El package solo declara la key; la resolución a texto
 * la hace cada renderer con su propio provider de i18n (o la usa tal cual si
 * no hay i18n configurado todavía).
 */
export type I18nKey = string;
