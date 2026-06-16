# Spec: Convención de paginación y response envelope

> **Estado:** aprobado — implementación existente.
> **Tarea:** TASK-22

## Decisión

La API usa **paginación por offset** en todos los endpoints de listado. Sin paginación por cursor.

Razones:
- El backoffice necesita "saltar a página X" — imposible con cursor.
- La implementación offset ya existe y está probada.
- Para un backoffice de administración, el rendimiento de offset con MySQL + índices es suficiente.

## Infraestructura existente

Todo vive en `apps/api/src/shared/`:

```
shared/
├── http/
│   ├── dto/
│   │   ├── pagination-query.dto.ts       # query params: page, limit, sort, order
│   │   └── paginated-response.dto.ts     # envelope: { data, meta }
│   └── decorators/
│       └── api-paginated-response.decorator.ts   # helper Swagger
├── types/
│   └── paginated-result.ts               # { items, total } — lo que devuelve el repo
└── query/
    ├── filter.ts                         # Filter<T> con predicados tipados
    ├── order.ts                          # Order<T>
    ├── limit.ts                          # Limit.page(page, limit)
    ├── find-spec.ts                      # FindSpec<T> = { filter?, order?, limit? }
    └── prisma/from-spec.ts              # specToPrismaArgs(spec) → Prisma where/orderBy/skip/take
```

## Contratos

### Query params — `PaginationQueryDto`

```ts
class PaginationQueryDto {
  page:  number = 1;    // min 1
  limit: number = 20;   // min 1, max 100
  sort?:  string;       // nombre de columna; whitelist en cada repositorio
  order: 'asc' | 'desc' = 'asc';
}
```

Cada recurso extiende esta clase y añade sus propios filtros:

```ts
class ListUsersQueryDto extends PaginationQueryDto {
  userType?: UserType;
  isActive?: boolean;
  search?: string;   // filtra por email/nombre
}
```

### Respuesta — `PaginatedResponseDto<T>`

```json
GET /v1/users?page=2&limit=20
200 OK
{
  "data": [{ "id": "...", "email": "...", ... }],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

`PaginatedResponseDto.of(items, total, page, limit)` construye el envelope.

### Puerto del repositorio — `PaginatedResult<T>`

Los repositorios devuelven `PaginatedResult<T>` (no el DTO HTTP):

```ts
interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// En el port del repositorio:
getRows(spec?: FindSpec<User>): Promise<PaginatedResult<User>>;
```

El controller mapea `PaginatedResult<Entity>` → `PaginatedResponseDto<ResponseDto>`:

```ts
const { items, total } = await this.listUsers.execute(query);
const data = items.map(UserResponseDto.fromEntity);
return PaginatedResponseDto.of(data, total, query.page, query.limit);
```

## Cómo usar el query DSL en un use case

```ts
import { Filter, Order, Limit } from '../../../../shared/query';

const filter = new Filter<User>()
  .addEqualValue('userType', 'BACKOFFICE')
  .addEqualValue('isActive', true);

const order = new Order<User>().addDesc('createdAt');
const limit = Limit.page(query.page, query.limit);

const { items, total } = await this.userRepo.getRows({ filter, order, limit });
```

Ver `shared/query/README.md` para el catálogo completo de operadores.

## Cómo documentarlo en Swagger

```ts
@Get()
@ApiPaginatedResponse(UserResponseDto)   // ← decorator helper
@ApiOperation({ summary: 'Listar usuarios' })
async list(@Query() query: ListUsersQueryDto) {
  // ...
}
```

Sin `@ApiPaginatedResponse`, Swagger mostraría `data: any[]`. Con él, expande el tipo concreto.

## Whitelist de campos ordenables

El sort-by field es un `string` libre en `PaginationQueryDto`. Cada repositorio valida internamente que el campo pedido es ordenable. Patrón recomendado:

```ts
const SORTABLE_FIELDS: Array<keyof User> = ['createdAt', 'email', 'firstName'];

// En el repositorio, antes de aplicar el order:
if (spec.order && !SORTABLE_FIELDS.includes(spec.order.field as keyof User)) {
  throw new AppException('VALIDATION_FAILED');
}
```

## Respuestas individuales (sin envelope)

`GET /users/:id`, `POST /auth/login` y similares devuelven el DTO plano, sin wrapper `{ data, meta }`. El envelope solo aplica a listados.

## Errores relacionados

| Código | HTTP | Cuándo |
|--------|------|--------|
| `VALIDATION_FAILED` | 400 | `page < 1`, `limit > 100`, `sort` inválido |

## Checklist de aceptación

- [x] `shared/http/dto/pagination-query.dto.ts` — query params tipados y validados
- [x] `shared/http/dto/paginated-response.dto.ts` — envelope `{ data, meta }` con factory `.of()`
- [x] `shared/types/paginated-result.ts` — tipo de retorno de repositorios
- [x] `shared/http/decorators/api-paginated-response.decorator.ts` — helper Swagger
- [x] `shared/query/` — DSL Filter/Order/Limit/FindSpec con traducción a Prisma
- [ ] Todos los endpoints de listado de IAM (users, roles, api-sections) usan este patrón
- [ ] `sort` con campo inválido devuelve `400 VALIDATION_FAILED`
- [ ] Swagger expande el tipo concreto de `data[]` en todos los listados

## Fuera de scope

- Cursor pagination — no se implementará. Si en el futuro algún recurso lo necesita (feed de eventos, tabla de auditoría con millones de filas), se añade como opt-in en ese recurso específico.
- Filtros genéricos (`filter[campo]=valor`) — cada recurso declara sus filtros en su propio `ListXxxQueryDto`.
- HATEOAS links (`prev`, `next` URLs).
