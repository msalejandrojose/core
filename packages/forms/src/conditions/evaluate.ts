import type { Condition } from '../types/condition.ts';
import type {
  DividerField,
  Field,
  GroupField,
  HeadingField,
} from '../types/field.ts';
import type { FormValues } from '../types/form.ts';

/** Lee un valor de los `values` admitiendo rutas con punto (`a.b.c`). */
function readValue(values: FormValues, path: string): unknown {
  if (path in values) return values[path];
  if (!path.includes('.')) return undefined;
  let cur: unknown = values;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return false;
}

/**
 * Evalúa una condición contra los valores actuales del formulario.
 * Función pura: mismos inputs → mismo resultado, sin efectos.
 */
export function evaluateCondition(
  condition: Condition,
  values: FormValues,
): boolean {
  if ('all' in condition) {
    return condition.all.every((c) => evaluateCondition(c, values));
  }
  if ('any' in condition) {
    return condition.any.some((c) => evaluateCondition(c, values));
  }
  if ('not' in condition) {
    return !evaluateCondition(condition.not, values);
  }

  const actual = readValue(values, condition.field);
  switch (condition.op) {
    case 'eq':
      return shallowEqual(actual, condition.value);
    case 'ne':
      return !shallowEqual(actual, condition.value);
    case 'in':
      return condition.values.some((v) => shallowEqual(actual, v));
    case 'nin':
      return !condition.values.some((v) => shallowEqual(actual, v));
    case 'truthy':
      return isTruthy(actual);
    case 'falsy':
      return !isTruthy(actual);
    case 'gt':
      return asNumber(actual) > condition.value;
    case 'gte':
      return asNumber(actual) >= condition.value;
    case 'lt':
      return asNumber(actual) < condition.value;
    case 'lte':
      return asNumber(actual) <= condition.value;
    default:
      // Operador desconocido (forward-compat): no filtra.
      return true;
  }
}

type ConditionalField = Field | GroupField | HeadingField | DividerField;

/** ¿Debe mostrarse el campo según `hidden` + `visibleWhen`? */
export function isFieldVisible(
  field: ConditionalField,
  values: FormValues,
): boolean {
  if ('hidden' in field && field.hidden) return false;
  if (field.visibleWhen) return evaluateCondition(field.visibleWhen, values);
  return true;
}

/** ¿Debe estar habilitado el campo según `readOnly` + `enabledWhen`? */
export function isFieldEnabled(field: Field, values: FormValues): boolean {
  if ('readOnly' in field && field.readOnly) return false;
  if ('enabledWhen' in field && field.enabledWhen) {
    return evaluateCondition(field.enabledWhen, values);
  }
  return true;
}
