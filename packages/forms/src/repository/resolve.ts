import type { Field, SelectOption } from '../types/field.ts';
import type { FormSchema } from '../types/form.ts';
import type {
  FormRepositoryOption,
  FormRepositoryRegistry,
} from './types.ts';

function toSelectOptions(options: FormRepositoryOption[]): SelectOption[] {
  return options.map((o) => ({
    value: o.value,
    label: o.label,
    disabled: o.disabled,
  }));
}

/** ¿Es un campo de selección que puede tener una fuente por repositorio? */
function isSelectLike(
  field: Field,
): field is Extract<Field, { type: 'select' | 'multiselect' | 'radio' }> {
  return (
    field.type === 'select' ||
    field.type === 'multiselect' ||
    field.type === 'radio'
  );
}

async function resolveField(
  field: Field,
  registry: FormRepositoryRegistry,
): Promise<Field> {
  if (field.type === 'group') {
    const fields = await Promise.all(
      field.fields.map((child) => resolveField(child, registry)),
    );
    return { ...field, fields };
  }

  if (isSelectLike(field) && field.source) {
    const repo = registry[field.source.repository];
    if (!repo) {
      console.warn(
        `[@core/forms] repositorio no registrado: "${field.source.repository}"`,
      );
      return field;
    }
    const result = await repo.list(field.source.query);
    return { ...field, options: toSelectOptions(result.options) };
  }

  return field;
}

/**
 * Resuelve los campos de selección con fuente por repositorio: sustituye su
 * `source` por las `options` reales obtenidas del `FormRepositoryRegistry`, de
 * modo que cualquier renderer pueda pintarlos como un select estático normal.
 *
 * Devuelve un schema nuevo (no muta el original). Los campos sin `source` (o
 * cuyo repositorio no esté registrado) se dejan intactos.
 */
export async function resolveFormRepositories(
  schema: FormSchema,
  registry: FormRepositoryRegistry,
): Promise<FormSchema> {
  const fields = await Promise.all(
    schema.fields.map((field) => resolveField(field, registry)),
  );
  return { ...schema, fields };
}
