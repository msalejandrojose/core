// Descriptor declarativo de un campo, en la misma línea que el schema de los
// formularios dinámicos. Dirige el render del backoffice (qué inputs pintar) y
// la validación server-side (ver `validate-fields.ts`). Se usa tanto para la
// config de una cuenta como para el contenido de un tipo de mensaje.
export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'boolean'
  // Plantilla de email por bloques (ver domain/template). El valor es un objeto
  // estructurado, no un escalar; se valida con `validateTemplate`.
  | 'template';

export interface FieldDescriptor {
  key: string;
  label: string;
  type: FieldType;
  /** Si es obligatorio (validación: presente y no vacío). */
  required?: boolean;
  /** Marca un secreto (apiKey, authToken…): se cifra en reposo y se enmascara. */
  secret?: boolean;
  /** Opciones válidas para `type: 'select'`. */
  options?: string[];
  /** Texto de ayuda para el editor. */
  help?: string;
}
