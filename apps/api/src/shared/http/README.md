# Convenciones REST para CRUD

Cuando añadas un CRUD nuevo en `modules/<feature>/infrastructure/http/`,
sigue estas reglas para que TODA la API se vea igual desde fuera.

## Verbos

| Verbo  | URL                | Cuándo                                         | Status OK |
|--------|--------------------|------------------------------------------------|-----------|
| GET    | `/recurso`         | Listar (paginado)                              | 200       |
| GET    | `/recurso/:id`     | Obtener uno                                    | 200       |
| POST   | `/recurso`         | Crear                                          | 201       |
| PATCH  | `/recurso/:id`     | Actualización parcial (campos opcionales)      | 200       |
| PUT    | `/recurso/:id`     | Reemplazo completo (raro; usa PATCH por defecto) | 200     |
| DELETE | `/recurso/:id`     | Borrar (soft o hard según el dominio)          | 204 si no devuelve cuerpo, 200 si sí |

**Regla de pulgar:** prefiere PATCH. PUT solo si tiene sentido semánticamente
reemplazar el recurso entero (raro, p.ej. config blobs).

## Listados (`GET /recurso`)

**Por defecto: cursor.** Extiende `CursorPaginationQueryDto` (limit, cursor).
Respuesta: `CursorPaginatedResponseDto<TResponseDto>` con `{ data, meta: { limit, nextCursor, hasMore } }`.
Decora con `@ApiCursorPaginatedResponse(TResponseDto)` para Swagger.
Todo en `shared/pagination/`.

**Opt-in: offset.** Solo si el endpoint necesita jump-to-page.
Extiende `PaginationQueryDto` (page, limit, sort, order).
Respuesta: `PaginatedResponseDto<TResponseDto>` con `{ data, meta: { page, limit, total, totalPages } }`.
Decora con `@ApiPaginatedResponse(TResponseDto)` para Swagger.
Todo en `shared/http/dto/`.

## Crear (`POST /recurso`)

- Body: `Create<Recurso>Dto` con todas las props requeridas explícitas.
- Respuesta: 201 + el recurso creado (`<Recurso>ResponseDto`).

## Actualizar parcial (`PATCH /recurso/:id`)

- Body: `Update<Recurso>Dto` con TODAS las props opcionales.
- Aplica solo los campos enviados. Los demás quedan como estaban.
- Respuesta: 200 + el recurso actualizado.

## Borrar (`DELETE /recurso/:id`)

- Si la entidad tiene flag `isActive`/`deletedAt`: soft delete.
- Si no: hard delete y documentar CASCADE de relaciones.
- Respuesta: 204 sin body.

## Errores estándar

| Status | Cuándo                                                              |
|--------|---------------------------------------------------------------------|
| 400    | Validación del DTO falla (class-validator)                         |
| 401    | Sin autenticar o token inválido                                     |
| 403    | Autenticado pero sin permiso (Fase 4)                              |
| 404    | Recurso no existe (`<Entity>NotFoundError`)                        |
| 409    | Conflicto / duplicado (`<Entity>AlreadyExistsError`)               |
| 422    | Regla de negocio rechaza la operación (otros `DomainError`)        |

Los errores de dominio se lanzan desde `application/use-cases/` y los traduce
el filter global en `shared/filters/domain-error.filter.ts`.

## DTOs

Cada controller tiene:
- `dto/create-<recurso>.dto.ts` — body de POST
- `dto/update-<recurso>.dto.ts` — body de PATCH (todo opcional)
- `dto/<recurso>-response.dto.ts` — shape pública con `static fromEntity(e)`
- `dto/list-<recurso>-query.dto.ts` — extiende `PaginationQueryDto`

**Nunca** exponer entidades de dominio directamente. Pasar siempre por
`<Recurso>ResponseDto.fromEntity()` para no filtrar campos por accidente
cuando alguien añada uno nuevo al dominio.
