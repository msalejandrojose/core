# @core/sections — Spec

Schema declarativo de **secciones de UI** compartido entre todas las apps del monorepo (backoffice, web, mobile). Una "sección" aquí es una unidad navegable visible para el usuario (entrada de menú, módulo, área, ruta), no una sección de la API.

> Estado: **draft**. Antes de implementar, validar con el primer árbol real del backoffice (módulos IAM + mailer).

---

## 1. Objetivos

- **Una sola fuente de verdad** del catálogo de secciones navegables por aplicación, con su jerarquía, rutas, iconos, permisos requeridos y orden.
- **Multiplataforma**: el mismo schema sirve para construir el sidebar del backoffice (React) y la tab/drawer de la app (Ionic). Cada plataforma trae su propio renderer.
- **Editable desde el backoffice**: las secciones se gestionan como entidad CRUD persistida — el equipo de operaciones puede crear, ocultar, reordenar o restringir secciones sin desplegar.
- **Permisos directos por rol y por usuario**: la sección es su propio anclaje de permisos. Hay tablas N-N `RoleSectionAccess` y `UserSectionAccess` para conceder o revocar acceso (ver §5).
- **Selector con repositorio**: la sección es una entity `form-exposable` (ver [[forms-spec]] §5) para poder elegirla en cualquier formulario como cualquier otra entidad de dominio.

### Fuera de alcance (de momento)

- Builder visual de páginas dentro de una sección (eso es un CMS, no es esto).
- Personalización por usuario (favoritos, pinned). Si llega, vivirá en una tabla aparte que referencia secciones.
- Permisos de la API. Eso es `ApiSection` (ver §2). La visibilidad de una `Section` se resuelve con sus propias tablas de acceso, no atravesando `ApiSection`.

---

## 2. `Section` ≠ `ApiSection`

Distinción crítica porque comparten nombre:

| Concepto | Para qué sirve | Quién la consume |
|---|---|---|
| `ApiSection` (módulo IAM) | Nodo del árbol de operaciones de la API. Es la unidad de granularidad de los permisos (`READ`/`WRITE`/`DELETE`/`ADMIN`). | Backend, guards, resolución de permisos. |
| `Section` (este spec) | Nodo del árbol de **navegación visible** en una app. Tiene ruta, icono, orden, y sus propias tablas de acceso por rol y usuario. | Frontends (backoffice, mobile). |

No comparten tablas de permisos. Si quieres que "el módulo Usuarios solo aparezca a quien pueda leer la API de usuarios", lo modelas asignando acceso a la `Section` `iam.users` al mismo rol que ya tiene `READ` sobre la `ApiSection` `users`. La fuente de verdad para visibilidad de UI es `RoleSectionAccess` / `UserSectionAccess` (§5), no `ApiSection`.

---

## 3. Convenciones generales

### 3.1 Tipos raíz

```ts
type SectionScope = "BACKOFFICE" | "APP" | "SHARED";

type Section = {
  id: string;                  // uuid en BD; estable
  code: string;                // único por scope, kebab-case (ej. "iam.users")
  scope: SectionScope;         // dónde se renderiza
  parentSectionId?: string;    // jerarquía; null = raíz del scope
  order: number;               // orden entre hermanos (entero, paso 10)
  label: I18nKey;              // texto del menú
  description?: I18nKey;       // tooltip / subtítulo
  icon?: IconRef;              // ver §3.3
  route?: RouteRef;            // §4. Null = es solo agrupador, no navega.
  badge?: BadgeRef;            // §3.4 — contador/dot dinámico
  isActive: boolean;           // soft-disable sin borrar
  visibleWhen?: Condition;     // condicional estático (ver [[forms-spec]] §6)
  defaultAccess?: DefaultAccess; // §5 — qué pasa si un usuario no tiene asignación explícita
  meta?: Record<string, Json>; // escape hatch — no abusar
  createdAt: string;           // ISO
  updatedAt: string;
};
```

`I18nKey` es siempre una key (`"backoffice.nav.users"`), nunca texto plano. Resolución la hace el renderer con el i18n de la plataforma — mismo contrato que [[forms-spec]] §2.2.

### 3.2 Scope

`scope` define **en qué app** vive la sección. No es un permiso — es un guard-rail estructural:

- `BACKOFFICE` → solo aparece en el sidebar del backoffice.
- `APP` → solo aparece en el shell de la app móvil/PWA.
- `SHARED` → aparece en ambos. Útil para "Perfil", "Notificaciones", "Cerrar sesión".

Una sección `SHARED` puede tener `route` distinta por scope (ver §4.2).

### 3.3 Iconos

```ts
type IconRef =
  | { kind: "lucide"; name: string }              // backoffice (lucide-react)
  | { kind: "ionicons"; name: string }            // mobile (Ionic)
  | { kind: "custom"; key: string };              // resuelto por el renderer
```

El renderer de cada plataforma decide qué `kind` soporta. Si una `Section SHARED` necesita renderizarse en ambas, lo recomendado es `kind: "custom"` con una key que cada renderer mapea a su pack nativo.

### 3.4 Badges dinámicos

```ts
type BadgeRef =
  | { kind: "static"; text: string; tone?: BadgeTone }
  | { kind: "counter"; endpoint: string; pollMs?: number }     // GET → { count: number }
  | { kind: "dot"; endpoint: string; pollMs?: number };        // GET → { active: boolean }

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
```

El polling es responsabilidad del renderer. Default `pollMs = 60000`.

---

## 4. Rutas

### 4.1 Forma básica

```ts
type RouteRef = {
  path: string;             // patrón estilo react-router ("/users/:id?")
  exact?: boolean;          // default false
  external?: boolean;       // default false; si true, target="_blank"
  params?: Record<string, string>; // valores por defecto para placeholders
};
```

### 4.2 Override por scope (para `SHARED`)

```ts
type SharedRouteRef =
  | RouteRef                                      // misma ruta en ambos scopes
  | { backoffice?: RouteRef; app?: RouteRef };    // distintas
```

La validación: si `scope = SHARED` y `route` no es del tipo override, ambas plataformas usan la misma `path`. Esto cubre el 80% de casos (`/profile` es `/profile` en ambos).

### 4.3 Reglas

- Un `path` debe ser único dentro de un mismo `scope`. Validación en backend al crear/actualizar.
- Una sección **sin** `route` es un agrupador puro. Debe tener al menos un hijo navegable o se considera muerta y se filtra del árbol servido.

---

## 5. Permisos sobre secciones

Cada `Section` es su propio anclaje de permisos. La resolución la hace el **backend** al servir el árbol (§6); el cliente nunca decide visibilidad por seguridad.

### 5.1 Modelo de acceso

```ts
type DefaultAccess = "OPEN" | "RESTRICTED";

type SectionAccessGrant = "GRANT" | "DENY";
```

- `defaultAccess` (en la propia `Section`):
  - `OPEN` (default): la sección es visible a todos los usuarios autenticados del scope a menos que exista una negación explícita.
  - `RESTRICTED`: la sección solo es visible si hay una concesión explícita (rol o usuario).
- `RoleSectionAccess`: vincula un `UserRole` con una `Section` con un `grant ∈ { GRANT, DENY }`.
- `UserSectionAccess`: override por usuario sobre una `Section`, también con `grant ∈ { GRANT, DENY }`. Gana sobre los roles.

### 5.2 Algoritmo de resolución (orden estricto)

Para cada `Section` y un usuario dado:

1. **Override de usuario**: si existe `UserSectionAccess(user, section)`, gana. `GRANT` → visible, `DENY` → oculta. Fin.
2. **Roles del usuario** (con herencia de `UserRole.parentRoleId`):
   - Si **algún** rol tiene `DENY` explícito → oculta. (Las negaciones de rol pesan más que las concesiones para evitar fugas.)
   - Si no hay `DENY` y **algún** rol tiene `GRANT` → visible.
3. **Default de la sección**: `OPEN` → visible, `RESTRICTED` → oculta.
4. **Herencia descendente del padre**: si la sección padre acaba oculta, los hijos también, aunque tengan grants propios. (Para forzar la visibilidad de un hijo hay que arreglar el padre — esto evita rutas huérfanas en el menú.)

Reglas adicionales:

- Una sección oculta **se omite** del árbol servido — el cliente no recibe ni el nodo ni sus hijos.
- El usuario `BACKOFFICE` solo recibe nodos con `scope ∈ { BACKOFFICE, SHARED }`. Idem para `APP`. Esto es además de los permisos, no en lugar de.
- Los grants/denies se gestionan desde el backoffice (§6.2) usando el mismo selector con repositorio para elegir usuarios, roles y secciones.

---

## 6. Contrato del backend

### 6.1 Endpoint que consumen los frontends

```
GET /api/sections/tree?scope=BACKOFFICE|APP
```

Devuelve el árbol **ya filtrado por permisos del usuario actual**, en orden:

```ts
type SectionTreeNode = {
  id: string;
  code: string;
  label: I18nKey;
  icon?: IconRef;
  route?: RouteRef;          // ya resuelta a la variante del scope si era SHARED
  badge?: BadgeRef;
  children: SectionTreeNode[];
};
```

Lo que **no** viaja al cliente: `defaultAccess`, `visibleWhen`, `isActive`, `meta`, ni las tablas de acceso. Son detalles de control que el cliente no necesita ni debe conocer.

### 6.2 Endpoints de gestión (backoffice)

CRUD estándar, protegido por la `ApiSection` `sections` con permisos:

```
GET    /api/sections                          # listado paginado (form-repository)
GET    /api/sections/:id
POST   /api/sections
PATCH  /api/sections/:id
DELETE /api/sections/:id                       # soft: pone isActive=false; hard solo si no tiene hijos
POST   /api/sections/:id/move                  # body: { parentSectionId, order }
```

Gestión de accesos:

```
GET    /api/sections/:id/access                # { roles: [...], users: [...] }
PUT    /api/sections/:id/access/role/:roleId   # body: { grant: "GRANT" | "DENY" }
DELETE /api/sections/:id/access/role/:roleId   # quita la entrada (vuelve al default)
PUT    /api/sections/:id/access/user/:userId   # body: { grant: "GRANT" | "DENY" }
DELETE /api/sections/:id/access/user/:userId

# Vistas inversas para pintar "qué ve este rol/usuario"
GET    /api/users/:id/sections                 # árbol resuelto para un usuario concreto (preview)
GET    /api/user-roles/:id/sections            # secciones donde el rol tiene asignación explícita
```

### 6.3 Form-repository

El módulo registra la entity `Section` como exposable en el endpoint genérico de [[forms-spec]] §5:

```ts
@FormRepository({
  entity: "Section",
  searchableFields: ["code", "label"],
  labelTemplate: ["label", "code"],   // "Usuarios — iam.users"
  filters: ["scope", "isActive"],
})
```

Esto permite usar un selector de secciones en cualquier formulario (`source: { kind: "repository", entity: "Section", query: { filters: { scope: "BACKOFFICE" } } }`).

---

## 7. Persistencia (Prisma)

Modelo a añadir a `apps/api/prisma/schema.prisma`:

```prisma
enum SectionScope {
  BACKOFFICE
  APP
  SHARED
}

enum SectionDefaultAccess {
  OPEN
  RESTRICTED
}

enum SectionAccessGrant {
  GRANT
  DENY
}

model Section {
  id                String                @id @default(uuid()) @db.Char(36)
  code              String                @db.VarChar(255)
  scope             SectionScope
  parentSectionId   String?               @map("parent_section_id") @db.Char(36)
  order             Int                   @default(0)
  labelKey          String                @map("label_key") @db.VarChar(255)
  descriptionKey    String?               @map("description_key") @db.VarChar(255)
  icon              Json?
  route             Json?
  badge             Json?
  isActive          Boolean               @default(true) @map("is_active")
  defaultAccess     SectionDefaultAccess  @default(OPEN) @map("default_access")
  visibleWhen       Json?                 @map("visible_when")
  meta              Json?
  createdAt         DateTime              @default(now()) @map("created_at")
  updatedAt         DateTime              @updatedAt @map("updated_at")

  // Self-relación para jerarquía
  parentSection     Section?              @relation("SectionHierarchy", fields: [parentSectionId], references: [id])
  childSections     Section[]             @relation("SectionHierarchy")

  // Accesos por rol y por usuario
  roleAccess        RoleSectionAccess[]
  userAccess        UserSectionAccess[]

  @@unique([scope, code])
  @@index([scope, parentSectionId, order])
  @@map("section")
}

/// Concesión o negación de acceso a una sección para un rol. Sin entrada =
/// cae al `defaultAccess` de la sección.
model RoleSectionAccess {
  userRoleId  String              @map("user_role_id") @db.Char(36)
  sectionId   String              @map("section_id") @db.Char(36)
  grant       SectionAccessGrant
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  userRole    UserRole            @relation(fields: [userRoleId], references: [id], onDelete: Cascade)
  section     Section             @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@id([userRoleId, sectionId])
  @@index([sectionId])
  @@map("role_section_access")
}

/// Override por usuario sobre una sección. Gana sobre cualquier acceso de rol,
/// incluyendo DENY explícito como bloqueo final.
model UserSectionAccess {
  userId      String              @map("user_id") @db.Char(36)
  sectionId   String              @map("section_id") @db.Char(36)
  grant       SectionAccessGrant
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  section     Section             @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@id([userId, sectionId])
  @@index([sectionId])
  @@map("user_section_access")
}
```

Además, añadir las relaciones inversas en los modelos existentes (`User` y `UserRole` del schema actual):

```prisma
model User {
  // … campos existentes …
  sectionAccess     UserSectionAccess[]
}

model UserRole {
  // … campos existentes …
  sectionAccess     RoleSectionAccess[]
}
```

Decisiones:

- **`code` único por `scope`**, no globalmente. Permite `("BACKOFFICE", "settings")` y `("APP", "settings")` distintos.
- **`defaultAccess` en la propia `Section`** y no como tabla aparte porque es una decisión de diseño de la sección, no de un asignador.
- **`RoleSectionAccess` y `UserSectionAccess`** replican el patrón ya consolidado de `RoleApiSectionPermission` / `UserApiSectionPermission` del módulo IAM (consistencia para quien lee el schema). La diferencia: aquí no hay nivel (`READ/WRITE/…`), solo `GRANT/DENY` porque la unidad de UI no tiene granularidad de operación.
- **JSON columns** para `icon`/`route`/`badge`/`visibleWhen`/`meta`: estos campos cambian de forma con el tiempo (nuevos `IconRef.kind`, etc.), no compensa modelar columnas. La validación la hace el módulo en application.
- **Soft-delete vía `isActive`** porque secciones huérfanas en el front (`route` cacheada) deben fallar suave.
- **`@@index([scope, parentSectionId, order])`** porque el endpoint `/tree` ordena por eso siempre.
- **`@@index([sectionId])`** en las dos tablas de acceso para responder rápido al `GET /api/sections/:id/access`.

---

## 8. Módulo backend (`apps/api/src/modules/sections/`)

Estructura hexagonal estándar (ver core-architecture skill §2.2). Específico:

```
modules/sections/
├── domain/
│   ├── entities/
│   │   ├── section.entity.ts                       # objeto puro TS
│   │   └── section-access.entity.ts                # value-object para grants
│   └── errors/{circular-hierarchy,duplicate-code,scope-mismatch}.error.ts
├── application/
│   ├── ports/
│   │   ├── section-repository.port.ts
│   │   └── section-access-repository.port.ts
│   ├── use-cases/
│   │   ├── list-sections.use-case.ts
│   │   ├── create-section.use-case.ts
│   │   ├── update-section.use-case.ts
│   │   ├── delete-section.use-case.ts
│   │   ├── move-section.use-case.ts
│   │   ├── get-section-tree.use-case.ts            # filtrado por permisos del usuario
│   │   ├── set-role-section-access.use-case.ts
│   │   ├── set-user-section-access.use-case.ts
│   │   ├── revoke-role-section-access.use-case.ts
│   │   └── revoke-user-section-access.use-case.ts
│   └── services/
│       └── section-access-resolver.ts              # implementa el algoritmo de §5.2
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-section.repository.ts
│   │   └── prisma-section-access.repository.ts
│   ├── mappers/section.mapper.ts
│   └── http/
│       ├── dto/{create,update,move,tree-query,set-access}.dto.ts
│       └── sections.controller.ts
└── sections.module.ts
```

`SectionAccessResolver` es **puro** (recibe la lista de `RoleSectionAccess` y `UserSectionAccess` que aplican al usuario y devuelve el árbol filtrado). No depende del módulo IAM más allá de pedirle "qué roles tiene este usuario" — esa parte se inyecta como puerto.

### Reglas de validación (domain)

- `parentSectionId` debe pertenecer al mismo `scope` o ser de `SHARED` cuando el hijo no lo es. Caso prohibido: padre `APP`, hijo `BACKOFFICE`.
- Detección de ciclos en `move` (un nodo no puede ser su propio antepasado).
- `route.path` único en el `scope` cuando no es null.
- Si `scope = SHARED`, validar shape de `route` (puede ser `RouteRef` o `{ backoffice?, app? }`).
- `RoleSectionAccess` y `UserSectionAccess` solo pueden referirse a secciones con `isActive = true` (validación en application; las inactivas no aceptan grants nuevos).

---

## 9. Estructura del package

```
packages/sections/
├── package.json                    # @core/sections, private, workspace:*
├── src/
│   ├── index.ts                    # re-exporta tipos y helpers
│   ├── types/
│   │   ├── section.ts              # Section, SectionScope, SectionTreeNode, DefaultAccess
│   │   ├── icon.ts                 # IconRef
│   │   ├── route.ts                # RouteRef, SharedRouteRef
│   │   ├── badge.ts                # BadgeRef
│   │   └── access.ts               # SectionAccessGrant, RoleSectionAccess, UserSectionAccess
│   └── helpers/
│       ├── defineSection.ts        # helper tipado para seeds
│       └── walkTree.ts             # utilidad pura para recorrer SectionTreeNode
└── SPEC.md                         # este documento
```

**No incluye renderers ni cliente HTTP.** Los renderers se nombran por **rol de app**, no por framework, para no atarnos a la tecnología concreta (hoy React/Ionic, mañana lo que sea):

- `packages/sections-bo/` → renderer del **backoffice** (sidebar + breadcrumbs).
- `packages/sections-app/` → renderer de la **app** (tabs/menu).
- El cliente HTTP lo aporta `@core/api-client` (genera el `GET /api/sections/tree` desde OpenAPI).

Convención para el monorepo: cuando un package depende de una app concreta, sufijo `-bo` o `-app`. Cuando es puramente compartido, sin sufijo (`@core/sections`, `@core/forms`).

El backend importa solo los tipos de `@core/sections` para tipar la respuesta del controller.

---

## 10. Seeds iniciales

Para arrancar el backoffice hace falta un seed mínimo con los módulos actuales:

```ts
defineSection({ code: "iam", scope: "BACKOFFICE", label: "backoffice.nav.iam.root", icon: "users",
  defaultAccess: "RESTRICTED",
  children: [
    defineSection({ code: "iam.users",       label: "backoffice.nav.iam.users",       route: "/iam/users",       defaultAccess: "RESTRICTED" }),
    defineSection({ code: "iam.roles",       label: "backoffice.nav.iam.roles",       route: "/iam/roles",       defaultAccess: "RESTRICTED" }),
    defineSection({ code: "iam.permissions", label: "backoffice.nav.iam.permissions", route: "/iam/permissions", defaultAccess: "RESTRICTED" }),
  ],
});
defineSection({ code: "settings", scope: "SHARED", label: "nav.settings", icon: "settings", route: "/settings", defaultAccess: "OPEN" });
defineSection({ code: "profile",  scope: "SHARED", label: "nav.profile",  icon: "user",     route: "/profile",  defaultAccess: "OPEN" });
```

Tras crear las secciones, el seed asigna `RoleSectionAccess` para el rol `admin` con `GRANT` sobre todas las secciones `RESTRICTED`, dejando el resto al `defaultAccess`.

Los seeds viven en `apps/api/prisma/seeds/sections.seed.ts` y se ejecutan con `pnpm --filter @core/api prisma:seed` (script nuevo a añadir).

---

## 11. Relación con otros packages

- [[forms-spec]] — `Section` es una entity expuesta como repository en el endpoint genérico de formularios.
- [[core-architecture]] — el módulo backend sigue la convención hexagonal-no-estricta de la API.
- Módulo IAM (`apps/api/src/modules/iam/`) — colabora vía `SectionPermissionResolver`; no se duplica lógica de permisos aquí.

---

## 12. Preguntas abiertas

Cosas a resolver antes de implementar:

1. **Versionado del árbol servido**: ¿enviamos un `etag` o `version` por scope para que el frontend cachee y solo recargue si hay cambios? Recomendación: sí, header `ETag` + cache local en cliente.
2. **Reordenación masiva**: el endpoint `/move` mueve uno. ¿Hace falta un `/reorder` que tome la lista entera de un parent? Posponer hasta tener UI real.
3. **Editor visual**: para crear/mover secciones el backoffice tendrá un árbol drag-and-drop. ¿Vive este builder en el mismo package o en `apps/backoffice`? Recomendación: en la app (es una pantalla más).
4. **Multi-tenant**: si la app fuera multi-tenant, ¿el árbol se filtra también por tenant? No aplica hoy. Si llega, será una columna `tenantId` en `Section` con índice compuesto.
5. **i18n**: ¿qué pasa si el `labelKey` no resuelve en una locale? El renderer muestra el `code` como fallback (consistente con [[forms-spec]] §2.2).

---

## 13. Próximos pasos

1. Validar este spec contra el árbol real del backoffice cuando tengamos los primeros módulos (IAM + mailer).
2. Crear el package `@core/sections` con solo tipos + `defineSection`.
3. Crear el módulo backend `modules/sections/` con CRUD + endpoint `/tree` + endpoints de gestión de accesos.
4. Seed inicial con la jerarquía actual del backoffice y el grant para `admin`.
5. Implementar el renderer `packages/sections-bo/` para el sidebar del backoffice.
6. Pantalla en el backoffice para gestionar `RoleSectionAccess` y `UserSectionAccess` (selector de sección + selector de rol/usuario + toggle GRANT/DENY).
7. Conectar con `@core/forms` registrando `Section`, `RoleSectionAccess` y `UserSectionAccess` como `FormRepository`.
