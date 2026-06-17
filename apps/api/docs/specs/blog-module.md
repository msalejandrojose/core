# Spec — Módulo `blog`

> Estado: **borrador / pendiente de implementar**
> Owner: backend
> Última edición: 2026-06-17

## 1. Objetivo

Disponer en `@core/api` de **un módulo** que exponga la API de un **blog de
noticias**: artículos (posts) organizados por **categorías** y **etiquetas**,
con flujo editorial (borrador → publicado → archivado), imagen de portada y
metadatos SEO.

Requisitos funcionales pedidos:

1. **CRUD completo de posts**: crear, editar, borrar y gestionar su contenido.
2. **CRUD de taxonomías**: categorías y etiquetas para clasificar los posts.
3. **Estado editorial**: un post se guarda como borrador y se publica cuando
   está listo (o se programa para una fecha). Se puede archivar sin borrarlo.
4. **Listado público** (solo `PUBLISHED`, cursor-paginado, filtrable por
   categoría/etiqueta) y **listado de administración** (todos los estados, para
   el backoffice).
5. **Portada** referenciando un fichero del módulo [`storage`](./storage-module.md)
   (no se sube el binario aquí: se referencia un `StoredFile` ya subido).

Sigue la arquitectura hexagonal no estricta de §2.2 de la skill
`core-architecture` y la convención de paginación de §9 (cursor por defecto).

## 2. Modelo conceptual

```
            ┌────────────┐        N      1 ┌────────────┐
            │    Post    │────────────────▶│  Category  │  (categoría principal, opcional)
            │            │                 └────────────┘
            │  - title   │
            │  - slug    │     N        N  ┌────────────┐
            │  - content │◀───────────────▶│    Tag     │  (vía pivot PostTag)
            │  - status  │   PostTag       └────────────┘
            │  - author  │
            └─────┬──────┘
                  │ N           1
                  ▼
            ┌────────────┐
            │    User    │  (autor del post)
            └────────────┘

  Post.coverImageId ───────▶ StoredFile (módulo storage, FK suave)
```

- **Post** = el artículo de noticia. Es la entidad central; su "contenido" vive
  en `content` (Markdown/HTML renderizado por el front).
- **Category** = clasificación principal jerárquica (self-FK opcional, p.ej.
  "Deportes" → "Fútbol"). Un post tiene **0..1** categoría.
- **Tag** = etiquetas libres transversales. Un post tiene **0..N** etiquetas.
- **PostTag** = pivot N-N entre Post y Tag.
- **author** = el `User` (tipo `BACKOFFICE`) que firma el artículo.

Categoría (1 por post, jerárquica) y etiquetas (N por post, planas) son
conceptos distintos a propósito: la categoría ordena la navegación del blog;
las etiquetas son descriptores cruzados.

## 3. Persistencia (Prisma)

Añadir a [`prisma/schema.prisma`](../../prisma/schema.prisma):

```prisma
/// Ciclo de vida editorial de un post.
enum PostStatus {
  DRAFT       // borrador, no visible en el listado público
  SCHEDULED   // programado: se publicará cuando publishedAt <= now()
  PUBLISHED   // visible públicamente
  ARCHIVED    // retirado del público sin borrarlo
}

/// Artículo del blog de noticias.
model Post {
  id              String     @id @default(uuid()) @db.Char(36)
  slug            String     @unique @db.VarChar(180)   // identificador legible para la URL pública
  title           String     @db.VarChar(200)
  excerpt         String?    @db.VarChar(320)           // resumen/dek para listados y SEO
  content         String     @db.LongText               // cuerpo del artículo (Markdown/HTML)
  status          PostStatus @default(DRAFT)
  publishedAt     DateTime?  @map("published_at")       // fecha de publicación (o de programación)
  coverImageId    String?    @map("cover_image_id") @db.Char(36)   // FK suave a StoredFile (módulo storage)
  authorId        String?    @map("author_id") @db.Char(36)

  // SEO
  metaTitle       String?    @map("meta_title") @db.VarChar(200)
  metaDescription String?    @map("meta_description") @db.VarChar(320)

  // Métricas
  viewCount       Int        @default(0) @map("view_count")

  categoryId      String?    @map("category_id") @db.Char(36)

  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  // Relaciones
  author   User?         @relation(fields: [authorId], references: [id], onDelete: SetNull)
  category PostCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  tags     PostTag[]

  @@index([status, publishedAt])   // listado público ordenado por fecha
  @@index([categoryId])
  @@index([authorId])
  @@map("post")
}

/// Categoría jerárquica del blog (self-FK opcional para subcategorías).
model PostCategory {
  id          String   @id @default(uuid()) @db.Char(36)
  slug        String   @unique @db.VarChar(140)
  name        String   @db.VarChar(140)
  description String?  @db.Text
  parentId    String?  @map("parent_id") @db.Char(36)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Self-relación para subcategorías
  parent   PostCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children PostCategory[] @relation("CategoryHierarchy")

  posts Post[]

  @@map("post_category")
}

/// Etiqueta transversal del blog.
model PostTag {
  id        String   @id @default(uuid()) @db.Char(36)
  slug      String   @unique @db.VarChar(140)
  name      String   @db.VarChar(140)
  createdAt DateTime @default(now()) @map("created_at")

  postTags PostTagOnPost[]

  @@map("post_tag")
}

/// Pivot N-N entre Post y PostTag.
model PostTagOnPost {
  postId String @map("post_id") @db.Char(36)
  tagId  String @map("tag_id") @db.Char(36)

  post Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  PostTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tag_on_post")
}
```

> **Nota sobre `Post.tags`**: el campo `tags PostTag[]` del modelo `Post` se
> renombra realmente a la relación contra el pivot. Implementación concreta: en
> `Post` declarar `tags PostTagOnPost[]` (no `PostTag[]`), porque la N-N pasa
> por la tabla pivot explícita `PostTagOnPost`. Se deja la tabla pivot explícita
> (en vez de la implícita de Prisma) para poder añadir metadatos al vínculo en
> el futuro y para mantener nombres de tabla controlados (`@@map`).

En `User` añadir la relación inversa:
```prisma
posts Post[]
```

> **`coverImageId` es una FK suave** (no declaramos `@relation` contra
> `StoredFile`): el blog referencia un fichero del módulo storage por id pero no
> acopla su ciclo de vida. La resolución de la URL del fichero se hace en el
> mapper llamando al `storage` (o el front pide `GET /files/:id`). Si más
> adelante se quiere integridad referencial dura, se añade la relación.

Migración:
```bash
pnpm --filter @core/api prisma:migrate -- --name add_blog
```

## 4. Estructura de carpetas

Siguiendo §2.2 de la skill `core-architecture`:

```
src/modules/blog/
├── domain/
│   ├── entities/
│   │   ├── post.entity.ts
│   │   ├── post-category.entity.ts
│   │   └── post-tag.entity.ts
│   ├── value-objects/
│   │   ├── slug.vo.ts              // normaliza/valida slugs (kebab-case)
│   │   └── post-status.vo.ts       // enum espejo (no acoplar a Prisma)
│   └── errors/
│       ├── post-not-found.error.ts
│       ├── slug-already-exists.error.ts
│       ├── category-not-found.error.ts
│       └── invalid-post-transition.error.ts
│
├── application/
│   ├── ports/
│   │   ├── post-repository.port.ts
│   │   ├── post-category-repository.port.ts
│   │   └── post-tag-repository.port.ts
│   ├── use-cases/
│   │   ├── create-post.use-case.ts
│   │   ├── update-post.use-case.ts
│   │   ├── delete-post.use-case.ts
│   │   ├── publish-post.use-case.ts        // DRAFT/SCHEDULED → PUBLISHED
│   │   ├── archive-post.use-case.ts        // * → ARCHIVED
│   │   ├── get-post.use-case.ts            // por id (admin) o por slug (público)
│   │   ├── list-posts.use-case.ts          // admin: todos los estados
│   │   ├── list-published-posts.use-case.ts// público: solo PUBLISHED
│   │   ├── create-category.use-case.ts
│   │   ├── update-category.use-case.ts
│   │   ├── delete-category.use-case.ts
│   │   ├── list-categories.use-case.ts
│   │   ├── create-tag.use-case.ts
│   │   ├── update-tag.use-case.ts
│   │   ├── delete-tag.use-case.ts
│   │   └── list-tags.use-case.ts
│   └── dto/
│       ├── create-post.input.ts
│       ├── update-post.input.ts
│       └── list-posts.input.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-post.repository.ts
│   │   ├── prisma-post-category.repository.ts
│   │   └── prisma-post-tag.repository.ts
│   ├── http/
│   │   ├── dto/
│   │   │   ├── create-post.dto.ts
│   │   │   ├── update-post.dto.ts
│   │   │   ├── list-posts.query.dto.ts
│   │   │   ├── post.response.dto.ts
│   │   │   ├── post-summary.response.dto.ts   // versión ligera para listados
│   │   │   ├── create-category.dto.ts
│   │   │   ├── update-category.dto.ts
│   │   │   ├── category.response.dto.ts
│   │   │   ├── create-tag.dto.ts
│   │   │   ├── update-tag.dto.ts
│   │   │   └── tag.response.dto.ts
│   │   ├── posts.controller.ts            // /blog/posts (admin)
│   │   ├── public-posts.controller.ts     // /blog/public/posts (público)
│   │   ├── categories.controller.ts       // /blog/categories
│   │   └── tags.controller.ts             // /blog/tags
│   └── mappers/
│       ├── post.mapper.ts
│       ├── post-category.mapper.ts
│       └── post-tag.mapper.ts
│
└── blog.module.ts
```

Importar `BlogModule` en `app.module.ts`.

## 5. Reglas de dominio

- **Slug**: se genera a partir del `title` si no se envía; se normaliza a
  kebab-case (`slug.vo.ts`). Debe ser único por tabla (post / categoría / tag).
  Colisión → `SLUG_ALREADY_EXISTS` (409). El slug de un post es **editable**
  mientras esté en `DRAFT`; una vez `PUBLISHED` se desaconseja cambiarlo (rompe
  enlaces) — se permite pero con aviso a nivel de front.
- **Transiciones de estado** (`publish-post`/`archive-post`):
  - `DRAFT → PUBLISHED`: setea `publishedAt = now()` si está vacío.
  - `DRAFT → SCHEDULED`: requiere `publishedAt` futuro.
  - `SCHEDULED → PUBLISHED`: automático cuando `publishedAt <= now()` (ver §8) o
    manual.
  - `PUBLISHED → ARCHIVED` y `ARCHIVED → PUBLISHED` permitidas.
  - Transición no contemplada → `INVALID_POST_TRANSITION` (422).
- **Borrado**: `DELETE` es borrado **físico** del post (y su pivot por cascade).
  Para "quitar del público sin perderlo" está `ARCHIVED`. No hay soft-delete en
  v1 (a diferencia de `StoredFile`); se documenta como posible iteración.
- **Categoría con posts**: borrar una categoría con posts asociados pone
  `post.categoryId = null` (la FK es `onDelete: SetNull`), no bloquea.
- **`viewCount`**: lo incrementa el endpoint público de detalle por slug
  (`GET /blog/public/posts/:slug`), de forma best-effort (no transaccional con
  la respuesta).

## 6. Endpoints HTTP

### 6.1 Administración (requieren JWT + permiso, ver §7)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/blog/posts` | Lista **todos** los posts (cualquier estado). Cursor-paginado. Filtros: `status`, `categoryId`, `tagId`, `authorId`, `titleContains`. |
| `GET` | `/blog/posts/:id` | Detalle por id (incluye borradores). |
| `POST` | `/blog/posts` | Crea un post (por defecto `DRAFT`). |
| `PATCH` | `/blog/posts/:id` | Edita campos y/o contenido. Acepta `tagIds` para reemplazar el set de etiquetas. |
| `DELETE` | `/blog/posts/:id` | Borra el post (204). |
| `POST` | `/blog/posts/:id/publish` | Publica o programa (`publishedAt` opcional en el body). |
| `POST` | `/blog/posts/:id/archive` | Archiva. |
| `GET` | `/blog/categories` | Lista categorías (offset-paginado, jump-to-page para tablas BO). |
| `POST` | `/blog/categories` | Crea categoría. |
| `PATCH` | `/blog/categories/:id` | Edita categoría. |
| `DELETE` | `/blog/categories/:id` | Borra categoría (204). |
| `GET` | `/blog/tags` | Lista etiquetas (offset-paginado, filtro `nameContains`). |
| `POST` | `/blog/tags` | Crea etiqueta. |
| `PATCH` | `/blog/tags/:id` | Edita etiqueta. |
| `DELETE` | `/blog/tags/:id` | Borra etiqueta (204). |

### 6.2 Público (sin JWT, solo lectura de contenido publicado)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/blog/public/posts` | Lista solo `PUBLISHED` con `publishedAt <= now()`. Cursor-paginado, orden `publishedAt DESC`. Filtros: `categorySlug`, `tagSlug`. |
| `GET` | `/blog/public/posts/:slug` | Detalle por slug. 404 si no está publicado. Incrementa `viewCount`. |
| `GET` | `/blog/public/categories` | Categorías con ≥1 post publicado. |
| `GET` | `/blog/public/tags` | Etiquetas con ≥1 post publicado. |

Los endpoints públicos van decorados con `@Public()` (decorador de §`shared/decorators`).
Todos los controllers llevan `@ApiTags('blog')`, `@ApiOperation`, y los de admin
`@ApiBearerAuth`.

### 6.3 Shapes de respuesta

- Detalle (`PostResponseDto`): post completo + `category` (resumida) + `tags[]` +
  `coverImageUrl` (resuelta desde storage) + `author` (id, nombre).
- Listados: `PostSummaryResponseDto` (sin `content`, con `excerpt`) envuelto en
  el envelope de paginación de §9 de `core-architecture`.

Ejemplo listado público:
```json
GET /blog/public/posts?limit=20&categorySlug=deportes
{
  "data": [
    { "id": "…", "slug": "…", "title": "…", "excerpt": "…",
      "coverImageUrl": "…", "publishedAt": "2026-06-17T10:00:00.000Z",
      "category": { "id": "…", "slug": "deportes", "name": "Deportes" },
      "tags": [ { "slug": "futbol", "name": "Fútbol" } ] }
  ],
  "meta": { "limit": 20, "nextCursor": "eyJ…", "hasMore": true }
}
```

## 7. Permisos (IAM)

Registrar en el catálogo `ApiSection` (seed) las secciones del módulo, para que
los roles puedan dar permiso granular (ver módulo IAM y BO-08 Roles):

| `code` | `name` | Padre |
|---|---|---|
| `blog` | Blog | — |
| `blog.posts` | Posts | `blog` |
| `blog.categories` | Categorías | `blog` |
| `blog.tags` | Etiquetas | `blog` |

- Endpoints **admin** → exigen permiso `READ`/`WRITE`/`DELETE` sobre la sección
  correspondiente (guard de permisos de IAM, igual que users/roles).
- Endpoints **público** → `@Public()`, sin permisos.

## 8. Programación de publicación (SCHEDULED → PUBLISHED)

- Un post `SCHEDULED` con `publishedAt <= now()` debe pasar a `PUBLISHED`.
- **MVP**: la transición se resuelve **en lectura** — el listado/detalle público
  filtra por `status = PUBLISHED OR (status = SCHEDULED AND publishedAt <= now())`,
  así que un programado vencido ya se ve sin necesidad de cron. El cambio físico
  del `status` lo hace, de forma diferida, un job.
- **Job (iteración 2)**: tarea programada que cada N minutos hace
  `UPDATE post SET status='PUBLISHED' WHERE status='SCHEDULED' AND published_at <= now()`.
  Se documenta pero **no se implementa en el MVP** (no hay scheduler aún en la
  API; cuando se añada BullMQ/cron para notificaciones, reusarlo).

## 9. Errores

Añadir al catálogo (`src/shared/errors/error-catalog.ts`) si no existen:

| Código | HTTP | Nivel | Cuándo |
|---|---|---|---|
| `POST_NOT_FOUND` | 404 | warn | id/slug inexistente o no publicado (público). |
| `SLUG_ALREADY_EXISTS` | 409 | warn | slug duplicado en post/categoría/tag. |
| `CATEGORY_NOT_FOUND` | 404 | warn | `categoryId` inexistente al crear/editar post. |
| `INVALID_POST_TRANSITION` | 422 | warn | transición de estado no permitida. |

Los lanza el dominio/application y los traduce el `DomainErrorFilter` ya
existente.

## 10. Fuera de scope (MVP)

Cosas que el spec deja preparadas pero NO se implementan en la primera vuelta:

- **Bloques de contenido estructurado** (editor por bloques tipo Notion): en v1
  `content` es un único `LongText` (Markdown/HTML). Si se necesita, se añade un
  modelo `PostBlock` con `order` + `type` + `data Json`.
- **Versionado / historial de ediciones** del post.
- **Comentarios** de lectores.
- **Soft-delete** de posts (hoy `DELETE` es físico; `ARCHIVED` cubre el caso de
  retirar sin perder).
- **Job de publicación programada** (ver §8): en MVP se resuelve en lectura.
- **i18n / multi-idioma** del contenido.
- **Relación dura `Post.coverImage → StoredFile`**: hoy es FK suave por id.

## 11. Quick checks antes de implementar

- [ ] El módulo respeta la frontera `domain` ⟂ Nest/Prisma (§2.3 de `core-architecture`).
- [ ] Slugs normalizados y únicos; colisión → `SLUG_ALREADY_EXISTS`.
- [ ] Listados públicos devuelven **solo** contenido visible (`PUBLISHED` o `SCHEDULED` vencido) y nunca borradores.
- [ ] Cada controller tiene `@ApiTags('blog')` + `@ApiOperation`; admin con `@ApiBearerAuth`, público con `@Public()`.
- [ ] Listado de posts usa cursor (§9); categorías/tags pueden usar offset si el BO necesita jump-to-page.
- [ ] Secciones `blog.*` sembradas en `ApiSection` para permisos.
- [ ] Migración corrida y `prisma generate` produce el cliente sin errores.
