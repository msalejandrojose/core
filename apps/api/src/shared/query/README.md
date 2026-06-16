# Query Builder genérico

Patrón uniforme para queries: `Filter<T>` + `Order<T>` + `Limit` agrupados en
`FindSpec<T>`, traducidos a Prisma por `specToPrismaArgs`.

## Cómo usarlo desde un use case

```ts
import { Filter, Limit, Order } from '../../../../shared/query';

const filter = new Filter<User>()
  .addEqualValue('userType', 'BACKOFFICE')
  .addLike('email', '%@core.dev')
  .addGreaterOrEqual('createdAt', new Date('2026-01-01'));

const order = new Order<User>().addDesc('createdAt').addAsc('email');
const limit = Limit.page(1, 20);

const { items, total } = await this.users.getRows({ filter, order, limit });
```

## Cómo lo expone un repository

```ts
interface UserRepositoryPort {
  // existentes (findById, findByEmail, create, update, …)
  getRows(spec?: FindSpec<User>): Promise<PaginatedResult<User>>;
  getRow(spec: FindSpec<User>): Promise<User | null>;
  getCount(filter?: Filter<User>): Promise<number>;
  getDistinctValues<K extends keyof User>(
    field: K,
    filter?: Filter<User>,
  ): Promise<User[K][]>;
}
```

## Operadores de Filter

| Método | Equivalente Prisma |
|---|---|
| `addEqualValue(f, v)` | `{ f: v }` |
| `addNotEqualValue(f, v)` | `{ f: { not: v } }` |
| `addIn(f, [v1, v2])` | `{ f: { in: [v1, v2] } }` |
| `addNotIn(f, [v])` | `{ f: { notIn: [v] } }` |
| `addLike(f, '%abc%')` | `{ f: { contains: 'abc' } }` |
| `addLike(f, 'abc%')` | `{ f: { startsWith: 'abc' } }` |
| `addLike(f, '%abc')` | `{ f: { endsWith: 'abc' } }` |
| `addLike(f, 'abc')` | `{ f: { equals: 'abc' } }` |
| `addGreaterThan(f, v)` | `{ f: { gt: v } }` |
| `addGreaterOrEqual(f, v)` | `{ f: { gte: v } }` |
| `addLessThan(f, v)` | `{ f: { lt: v } }` |
| `addLessOrEqual(f, v)` | `{ f: { lte: v } }` |
| `addIsNull(f)` | `{ f: null }` |
| `addIsNotNull(f)` | `{ f: { not: null } }` |

**Predicados sobre el mismo campo** se mergean cuando se puede (rangos
`gt/gte/lt/lte` componen `{ gt, lt }`). Para conflictos otros (eq + gt), el
último gana. Para AND complejo / OR / NOT: tarea futura.

## Type-safety

`keyof T` constraint en los métodos. Si renombras un campo de la entity, el
compilador te marca todos los sitios. Recomendación: ejecutar `pnpm build`
después de cualquier rename para verificar.

## Patrones a evitar

- **No mezcles `getRows(spec)` con `findMany(opts)` en código nuevo.** El
  `findMany` es un compat shim `@deprecated`. Migra los use cases que lo
  usen al patrón nuevo y bórralo cuando esté limpio.
- **No traigas todo sin `limit`.** `getRows({})` sin limit devuelve N filas.
  Si N puede crecer, paginar.
- **No filtres por métodos de la entity** (`isDeactivated`, etc.). Filter
  acepta `keyof T` pero los métodos no son columnas. Runtime error al
  traducir.

## Añadir un nuevo operador

1. Añade el variante a `Predicate<T>` en `filter.ts`.
2. Añade el `add*` correspondiente en la clase `Filter<T>`.
3. Añade el case en `applyPredicate` de `prisma/from-spec.ts`.
4. Añade un test en `prisma/from-spec.spec.ts`.

Eso es todo — el resto del código se beneficia automáticamente.
