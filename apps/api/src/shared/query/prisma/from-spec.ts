import type { Filter, Predicate } from '../filter';
import type { FindSpec } from '../find-spec';
import type { Limit } from '../limit';
import type { Order } from '../order';

// Args genéricos para `prisma.x.findMany` / `count` / `findFirst`.
export interface PrismaArgs {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'>[];
  take?: number;
  skip?: number;
}

export function specToPrismaArgs<T>(spec: FindSpec<T> = {}): PrismaArgs {
  return {
    where: filterToPrismaWhere(spec.filter),
    orderBy: orderToPrismaOrderBy(spec.order),
    ...limitToPrismaPaging(spec.limit),
  };
}

// Traduce los predicados a un `where` de Prisma. Predicados sobre el mismo
// campo se mergean en lo posible: `gt` + `lt` sobre el mismo campo →
// `{ gt: …, lt: … }` (rango). Otros conflictos: el último gana (Object.assign).
export function filterToPrismaWhere<T>(
  filter?: Filter<T>,
): Record<string, unknown> {
  if (!filter || filter.isEmpty()) return {};

  const where: Record<string, unknown> = {};
  for (const p of filter.predicates) {
    applyPredicate(where, p);
  }
  return where;
}

function applyPredicate<T>(
  where: Record<string, unknown>,
  p: Predicate<T>,
): void {
  const field = p.field as string;
  switch (p.op) {
    case 'eq':
      where[field] = p.value;
      return;
    case 'ne':
      where[field] = { not: p.value };
      return;
    case 'in':
      where[field] = { in: [...p.values] };
      return;
    case 'notIn':
      where[field] = { notIn: [...p.values] };
      return;
    case 'like':
      where[field] = translateLikePattern(p.pattern);
      return;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      where[field] = mergeRangeOp(where[field], p.op, p.value);
      return;
    case 'isNull':
      where[field] = null;
      return;
    case 'isNotNull':
      where[field] = { not: null };
      return;
  }
}

function translateLikePattern(pattern: string): unknown {
  const startsWithPct = pattern.startsWith('%');
  const endsWithPct = pattern.endsWith('%');
  const stripped = pattern.replace(/^%/, '').replace(/%$/, '');

  if (startsWithPct && endsWithPct) return { contains: stripped };
  if (endsWithPct) return { startsWith: stripped };
  if (startsWithPct) return { endsWith: stripped };
  return { equals: stripped };
}

function mergeRangeOp(
  existing: unknown,
  op: 'gt' | 'gte' | 'lt' | 'lte',
  value: unknown,
): Record<string, unknown> {
  if (
    existing &&
    typeof existing === 'object' &&
    !Array.isArray(existing)
  ) {
    return { ...(existing as Record<string, unknown>), [op]: value };
  }
  return { [op]: value };
}

export function orderToPrismaOrderBy<T>(
  order?: Order<T>,
): Record<string, 'asc' | 'desc'>[] {
  if (!order || order.isEmpty()) return [];
  return order.items.map((i) => ({ [i.field as string]: i.direction }));
}

export function limitToPrismaPaging(
  limit?: Limit,
): { take?: number; skip?: number } {
  if (!limit) return {};
  return { take: limit.take, skip: limit.skip };
}
