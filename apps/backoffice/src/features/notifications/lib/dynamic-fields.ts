import { MASK, type FieldDescriptor } from '../types';

export type DynamicValues = Record<string, unknown>;
export type FieldErrors = Record<string, string>;

/**
 * Valores iniciales del formulario dinámico para un conjunto de descriptores.
 * En edición, se prellena desde `source` (la config/content ya guardada); los
 * secretos NO se prellenan (llegan enmascarados) — el input queda vacío y solo
 * se envían si el usuario los reemplaza.
 */
export function initialValues(
  descriptors: FieldDescriptor[],
  source?: Record<string, unknown>,
): DynamicValues {
  const out: DynamicValues = {};
  for (const d of descriptors) {
    const raw = source?.[d.key];
    if (d.secret) {
      out[d.key] = '';
    } else if (d.type === 'boolean') {
      out[d.key] = raw === true;
    } else if (d.type === 'template') {
      out[d.key] =
        raw !== undefined && raw !== null ? JSON.stringify(raw, null, 2) : '';
    } else {
      out[d.key] = raw !== undefined && raw !== null ? String(raw) : '';
    }
  }
  return out;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Validación client-side de los campos dinámicos (la definitiva la hace el
 * servidor). Comprueba obligatorios y JSON de plantillas. En edición, un secreto
 * vacío es válido (⇒ se conserva el guardado).
 */
export function validateDynamic(
  descriptors: FieldDescriptor[],
  values: DynamicValues,
  mode: 'create' | 'edit',
): FieldErrors {
  const errors: FieldErrors = {};
  for (const d of descriptors) {
    const value = values[d.key];
    if (d.required && isEmpty(value)) {
      // Un secreto obligatorio en edición puede dejarse vacío (se conserva).
      if (d.secret && mode === 'edit') continue;
      errors[d.key] = 'Campo obligatorio';
      continue;
    }
    if (d.type === 'template' && !isEmpty(value)) {
      try {
        JSON.parse(String(value));
      } catch {
        errors[d.key] = 'JSON no válido';
      }
    }
  }
  return errors;
}

/**
 * Construye el objeto `config`/`content` a enviar a la API a partir de los
 * valores del formulario: castea números/booleanos, parsea plantillas y omite
 * los campos vacíos (para secretos vacíos en edición ⇒ el backend conserva el
 * valor cifrado existente).
 */
export function buildPayload(
  descriptors: FieldDescriptor[],
  values: DynamicValues,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of descriptors) {
    const value = values[d.key];
    if (d.type === 'boolean') {
      out[d.key] = value === true;
      continue;
    }
    if (isEmpty(value)) continue;
    if (d.type === 'number') {
      out[d.key] = Number(value);
    } else if (d.type === 'template') {
      out[d.key] = JSON.parse(String(value));
    } else {
      out[d.key] = value;
    }
  }
  return out;
}

/** Texto de placeholder para un secreto en edición (ya hay uno guardado). */
export function secretPlaceholder(hasExisting: boolean): string {
  return hasExisting ? `Guardado (${MASK}) — dejar vacío para conservar` : '';
}
