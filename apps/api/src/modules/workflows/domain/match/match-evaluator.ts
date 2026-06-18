import {
  MATCH_OPERATORS,
  MatchExpression,
  MatchOperator,
} from './match-expression';

// Evaluador puro del mini-DSL de match (spec §4.3). Sin dependencias externas.

const OPERATOR_SET = new Set<string>(MATCH_OPERATORS);

/** Lookup por ruta con notación de punto: `address.country` → target.address.country */
function getPath(target: unknown, path: string): unknown {
  if (target == null) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, target);
}

function isOperatorObject(
  cond: unknown,
): cond is Partial<Record<MatchOperator, unknown>> {
  return (
    typeof cond === 'object' &&
    cond !== null &&
    !Array.isArray(cond) &&
    Object.keys(cond).length > 0 &&
    Object.keys(cond).every((k) => OPERATOR_SET.has(k))
  );
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

function applyOperators(
  value: unknown,
  ops: Partial<Record<MatchOperator, unknown>>,
): boolean {
  for (const [op, operand] of Object.entries(ops) as [
    MatchOperator,
    unknown,
  ][]) {
    switch (op) {
      case 'eq':
        if (value !== operand) return false;
        break;
      case 'neq':
        if (value === operand) return false;
        break;
      case 'gt': {
        const a = asNumber(value);
        const b = asNumber(operand);
        if (a === null || b === null || !(a > b)) return false;
        break;
      }
      case 'gte': {
        const a = asNumber(value);
        const b = asNumber(operand);
        if (a === null || b === null || !(a >= b)) return false;
        break;
      }
      case 'lt': {
        const a = asNumber(value);
        const b = asNumber(operand);
        if (a === null || b === null || !(a < b)) return false;
        break;
      }
      case 'lte': {
        const a = asNumber(value);
        const b = asNumber(operand);
        if (a === null || b === null || !(a <= b)) return false;
        break;
      }
      case 'in':
        if (!Array.isArray(operand) || !operand.includes(value)) return false;
        break;
      case 'nin':
        if (Array.isArray(operand) && operand.includes(value)) return false;
        break;
      case 'exists': {
        const present = value !== undefined;
        if (present !== Boolean(operand)) return false;
        break;
      }
    }
  }
  return true;
}

/**
 * Evalúa una `MatchExpression` contra un objeto. Una expresión vacía/ausente
 * matchea siempre. `$or` combina con OR; el resto de claves con AND.
 */
export function evaluateMatch(
  expr: MatchExpression | null | undefined,
  target: unknown,
): boolean {
  if (expr == null) return true;
  if (typeof expr !== 'object' || Array.isArray(expr)) return false;

  const entries = Object.entries(expr) as [string, unknown][];
  if (entries.length === 0) return true;

  for (const [key, cond] of entries) {
    if (key === '$or') {
      const branches = cond as MatchExpression[];
      if (!Array.isArray(branches)) return false;
      if (!branches.some((b) => evaluateMatch(b, target))) return false;
      continue;
    }

    const value = getPath(target, key);
    if (isOperatorObject(cond)) {
      if (!applyOperators(value, cond)) return false;
    } else if (value !== cond) {
      // Azúcar de igualdad para literales.
      return false;
    }
  }

  return true;
}
