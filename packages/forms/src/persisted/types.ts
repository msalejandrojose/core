/**
 * Schema "persistido" de un formulario dinámico: la forma JSON que las apps
 * (backoffice, web) guardan en `Form.schema` vía la API. La API solo valida
 * `version` + `fields[].key` + `fields[].type`; el resto de metadatos los
 * define esta convención compartida.
 *
 * Es distinto del `FormSchema` declarativo de `@core/forms` (que usa `name` y
 * `validations[]`): se traduce de uno a otro con `apiSchemaToCoreSchema`.
 */

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldSchema {
  key: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  /** select / multiselect / radio */
  options?: FormFieldOption[];
  /** text / textarea / email */
  minLength?: number;
  maxLength?: number;
  /** number */
  min?: number;
  max?: number;
  step?: number;
  /** text / textarea / email (regex sin delimitadores) */
  pattern?: string;
  /** textarea */
  rows?: number;
}

export interface FormSchemaJson {
  version: number;
  fields: FormFieldSchema[];
}
