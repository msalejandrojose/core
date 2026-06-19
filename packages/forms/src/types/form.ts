import type { Field } from './field.ts';

/** Schema declarativo de un formulario completo. JSON-serializable. */
export interface FormSchema {
  id?: string;
  fields: readonly Field[];
}

/** Modelo de valores de un formulario (clave de campo → valor). */
export type FormValues = Record<string, unknown>;
