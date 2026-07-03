import type { Field } from '../types/field.ts';
import type { SelectOption } from '../types/field.ts';
import type { FormSchema } from '../types/form.ts';
import type { Validation } from '../types/validation.ts';
import type {
  FormFieldOption,
  FormFieldSchema,
  FormSchemaJson,
} from './types.ts';

function toOptions(options: FormFieldOption[] | undefined): SelectOption[] {
  return (options ?? []).map((o) => ({ value: o.value, label: o.label }));
}

function toValidations(field: FormFieldSchema): Validation[] {
  const validations: Validation[] = [];
  if (field.required) validations.push({ kind: 'required' });
  if (field.type === 'email') validations.push({ kind: 'email' });
  if (typeof field.minLength === 'number')
    validations.push({ kind: 'minLength', value: field.minLength });
  if (typeof field.maxLength === 'number')
    validations.push({ kind: 'maxLength', value: field.maxLength });
  if (typeof field.min === 'number')
    validations.push({ kind: 'min', value: field.min });
  if (typeof field.max === 'number')
    validations.push({ kind: 'max', value: field.max });
  if (field.pattern && field.pattern.trim())
    validations.push({ kind: 'pattern', value: field.pattern });
  return validations;
}

/**
 * Traduce el schema persistido (`FormSchemaJson`) al schema declarativo de
 * `@core/forms`, de modo que un mismo renderer pinte tanto el preview del
 * builder (backoffice) como el formulario público (web). Garantiza paridad
 * WYSIWYG sin duplicar la lógica de mapeo.
 */
export function apiSchemaToCoreSchema(schema: FormSchemaJson): FormSchema {
  const fields: Field[] = schema.fields.map((f) => {
    const base = {
      name: f.key,
      label: f.label,
      placeholder: f.placeholder,
      helpText: f.helpText,
      required: f.required,
      validations: toValidations(f),
    };
    switch (f.type) {
      case 'textarea':
        return { ...base, type: 'textarea', rows: f.rows };
      case 'number':
        return {
          ...base,
          type: 'number',
          min: f.min,
          max: f.max,
          step: f.step,
        };
      case 'select':
        return { ...base, type: 'select', options: toOptions(f.options) };
      case 'multiselect':
        return { ...base, type: 'multiselect', options: toOptions(f.options) };
      case 'radio':
        return { ...base, type: 'radio', options: toOptions(f.options) };
      case 'checkbox':
        return { ...base, type: 'checkbox' };
      case 'email':
        return { ...base, type: 'email' };
      case 'date':
        return { ...base, type: 'date' };
      case 'text':
      default:
        return { ...base, type: 'text' };
    }
  });
  return { fields };
}
