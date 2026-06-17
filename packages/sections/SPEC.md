# Spec: @core/sections — gestión del árbol de secciones de UI

> **Estado:** draft — validar contra el primer árbol real del backoffice antes de implementar.
> **Tarea:** TASK-38

## Objetivo

Sistema para gestionar el árbol de **secciones navegables de UI** (sidebar del backoffice,
tabs/menú de la app) desde un catálogo persistido, editable y filtrado por permisos.

## Distinción crítica: Section ≠ ApiSection

| Concepto | Qué controla | Tabla/módulo |
|---|---|---|
| `ApiSection` (IAM) | Quién puede **llamar** a un endpoint de la API | `api_section`, módulo `iam` |
| `Section` (este módulo) | Quién puede **ver** un ítem de navegación en la UI | `section`, módulo `sections` |

Son independientes. Un usuario puede tener acceso a la sección de UI "Usuarios" pero el guard
de la API sigue verificando si tiene permiso para cada operación concreta.

Un `Section` puede declarar `apiRequirements: string[]` (códigos de `ApiSection`) para que el
backend filtre la sección si el usuario no tiene acceso a ninguno de esos endpoints — esto es
una conveniencia, no el mecanismo de seguridad real.

## Modelo de datos conceptual

```
Section
  id: uuid
  code: string            # slug único por scope ('users', 'users.list', 'settings')
  name: string            # clave i18n ('nav.users')
  icon?: string           # identificador de icono ('Users', 'Settings', etc.)
  route?: string          # path en la app ('/users', '/settings')
  parentId?: uuid         # FK a Section (árbol jerárquico)
  scope: SectionScope     # BACKOFFICE | APP | SHARED
  order: number           # posición entre hermanos (0-indexed)
  isActive: boolean
  createdAt, updatedAt

RoleSectionAccess
  userRoleId: uuid → UserRole
  sectionId:  uuid → Section
  access: SectionAccessType   # GRANT | DENY
  @@id([userRoleId, sectionId])

UserSectionAccess
  userId:    uuid → User
  sectionId: uuid → Section
  access: SectionAccessType   # GRANT | DENY
  @@id([userId, sectionId])
```

## Resolución de permisos

Mismo patrón que IAM (`RoleApiSectionPermission` / `UserApiSectionPermission`):

1. Buscar override de usuario (`UserSectionAccess`) para la sección.
   - Si `DENY` → sección oculta.
   - Si `GRANT` → sección visible.
2. Si no hay override, subir por los roles del usuario y sus roles padre.
   - Si algún rol tiene `DENY` → sección oculta (DENY gana sobre GRANT).
   - Si algún rol tiene `GRANT` → sección visible.
3. Si no hay ningún registro → sección oculta por defecto (deny-by-default).

La resolución se hace en el backend; el frontend solo recibe el árbol ya filtrado.

## Package `@core/sections`

Tipos y utilidades compartidas entre el backend y los renderers de cada app.
**Sin dependencias de framework** (no React, no Ionic, no NestJS).

```
packages/sections/
├── package.json              # @core/sections, private: true
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts              # tipos exportados
│   └── helpers/
│       ├── define-section.ts # helper defineSection() con type inference
│       └── walk-tree.ts      # walkTree(), findSection(), flattenTree()
└── SPEC.md
```

### Tipos principales

```ts
export type SectionScope = 'BACKOFFICE' | 'APP' | 'SHARED';
export type SectionAccessType = 'GRANT' | 'DENY';

export interface Section {
  id: string;
  code: string;
  name: string;          // clave i18n
  icon?: string;
  route?: string;
  parentId?: string;
  scope: SectionScope;
  order: number;
  isActive: boolean;
  apiRequirements?: string[];  // códigos de ApiSection requeridos
}

export interface SectionTreeNode extends Section {
  children: SectionTreeNode[];
}
```

### `defineSection()` — helper con type inference

```ts
// apps/backoffice/src/sections/index.ts
import { defineSection } from '@core/sections';

export const SECTIONS = defineSection({
  scope: 'BACKOFFICE',
  items: [
    {
      code: 'dashboard',
      name: 'nav.dashboard',
      icon: 'LayoutDashboard',
      route: '/dashboard',
      order: 0,
    },
    {
      code: 'users',
      name: 'nav.users',
      icon: 'Users',
      route: '/users',
      order: 1,
      children: [
        { code: 'users.list', name: 'nav.users.list', route: '/users', order: 0 },
        { code: 'users.create', name: 'nav.users.create', route: '/users/new', order: 1 },
      ],
    },
  ],
});
```

### `walkTree()` — utilidades de árbol

```ts
walkTree(tree: SectionTreeNode[], visitor: (node: SectionTreeNode) => void): void
findSection(tree: SectionTreeNode[], code: string): SectionTreeNode | undefined
flattenTree(tree: SectionTreeNode[]): SectionTreeNode[]
```

## Módulo backend `apps/api/src/modules/sections/`

Mismo patrón hexagonal que IAM.

### Estructura

```
modules/sections/
├── domain/
│   ├── entities/section.entity.ts
│   └── errors/
│       ├── section-not-found.error.ts
│       ├── section-already-exists.error.ts
│       ├── section-cycle.error.ts         # ciclo en jerarquía
│       └── section-scope-mismatch.error.ts
├── application/
│   ├── ports/
│   │   └── section-repository.port.ts
│   └── use-cases/
│       ├── create-section.use-case.ts
│       ├── update-section.use-case.ts
│       ├── delete-section.use-case.ts     # soft delete
│       ├── list-sections.use-case.ts
│       ├── get-section.use-case.ts
│       └── get-section-tree.use-case.ts   # árbol filtrado por permisos
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-section.repository.ts
│   │   └── section.mapper.ts
│   └── http/
│       ├── sections.controller.ts
│       └── dto/
│           ├── create-section.dto.ts
│           ├── update-section.dto.ts
│           ├── section-response.dto.ts
│           ├── section-tree-node.dto.ts
│           └── list-sections-query.dto.ts
└── sections.module.ts
```

### Endpoint principal

```
GET /sections/tree?scope=BACKOFFICE
```

Respuesta: árbol de secciones visibles para el usuario autenticado, filtrado por permisos.
Solo incluye secciones con `isActive = true`.

```json
[
  {
    "id": "...",
    "code": "dashboard",
    "name": "nav.dashboard",
    "icon": "LayoutDashboard",
    "route": "/dashboard",
    "scope": "BACKOFFICE",
    "order": 0,
    "children": []
  },
  {
    "id": "...",
    "code": "users",
    "name": "nav.users",
    "icon": "Users",
    "route": "/users",
    "scope": "BACKOFFICE",
    "order": 1,
    "children": [
      { "code": "users.list", ... },
      { "code": "users.create", ... }
    ]
  }
]
```

### CRUD endpoints (gestión en el backoffice)

```
GET    /sections               # listado paginado (admin)
POST   /sections               # crear sección
GET    /sections/:id           # obtener una
PATCH  /sections/:id           # actualizar
DELETE /sections/:id           # soft delete

# Accesos por rol:
PUT    /sections/:id/role-access/:roleId    # GRANT | DENY
DELETE /sections/:id/role-access/:roleId    # quitar acceso

# Accesos por usuario:
PUT    /sections/:id/user-access/:userId    # GRANT | DENY
DELETE /sections/:id/user-access/:userId    # quitar acceso
```

### Validaciones de dominio

- **Ciclos de jerarquía**: al asignar `parentId`, verificar que el padre no es descendiente del nodo.
- **Scope coherente**: un hijo no puede tener scope diferente al del padre (salvo que el padre sea SHARED).
- **Unicidad**: `(code, scope)` único.
- **`isActive`**: al desactivar una sección, los hijos quedan implícitamente ocultos (no se persiste en cascada — el árbol filtrado los excluye al excluir al padre).

## Migración Prisma

```prisma
enum SectionScope {
  BACKOFFICE
  APP
  SHARED
}

enum SectionAccessType {
  GRANT
  DENY
}

model Section {
  id               String        @id @default(uuid()) @db.Char(36)
  code             String        @db.VarChar(255)
  name             String        @db.VarChar(255)
  icon             String?       @db.VarChar(100)
  route            String?       @db.VarChar(500)
  parentId         String?       @map("parent_id") @db.Char(36)
  scope            SectionScope
  order            Int           @default(0)
  isActive         Boolean       @default(true) @map("is_active")
  apiRequirements  Json?         @map("api_requirements")  // string[] de códigos
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  parent           Section?      @relation("SectionTree", fields: [parentId], references: [id])
  children         Section[]     @relation("SectionTree")
  roleAccess       RoleSectionAccess[]
  userAccess       UserSectionAccess[]

  @@unique([code, scope])
  @@index([scope, isActive, order])
  @@map("section")
}

model RoleSectionAccess {
  userRoleId  String            @map("user_role_id") @db.Char(36)
  sectionId   String            @map("section_id") @db.Char(36)
  access      SectionAccessType
  createdAt   DateTime          @default(now()) @map("created_at")

  userRole    UserRole            @relation(fields: [userRoleId], references: [id], onDelete: Cascade)
  section     Section             @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@id([userRoleId, sectionId])
  @@index([sectionId])
  @@map("role_section_access")
}

model UserSectionAccess {
  userId    String            @map("user_id") @db.Char(36)
  sectionId String            @map("section_id") @db.Char(36)
  access    SectionAccessType
  createdAt DateTime          @default(now()) @map("created_at")

  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  section     Section             @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@id([userId, sectionId])
  @@index([sectionId])
  @@map("user_section_access")
}
```

## Seed inicial
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

`apps/api/prisma/seeds/sections.seed.ts`

Secciones del backoffice para Phase 1 (TASK-30):

```ts
// Jerarquía de secciones BACKOFFICE
const sections = [
  { code: 'dashboard', name: 'nav.dashboard', icon: 'LayoutDashboard', route: '/dashboard', scope: 'BACKOFFICE', order: 0 },
  { code: 'iam',       name: 'nav.iam',       icon: 'Shield',          scope: 'BACKOFFICE', order: 1 },
  { code: 'iam.users',    name: 'nav.iam.users',    route: '/users',    parent: 'iam', order: 0 },
  { code: 'iam.roles',    name: 'nav.iam.roles',    route: '/roles',    parent: 'iam', order: 1 },
  { code: 'iam.sections', name: 'nav.iam.sections', route: '/sections', parent: 'iam', order: 2 },
  { code: 'storage', name: 'nav.storage', icon: 'Files', route: '/files', scope: 'BACKOFFICE', order: 2 },
];

// Rol admin tiene GRANT en todas
```

## Renderers (fuera de scope de TASK-38)

- `packages/sections-react/` — sidebar del backoffice, usa el árbol de secciones para renderizar el menú.
- `packages/sections-ionic/` — tabs/menú de la app móvil.

Estos packages dependen de `@core/sections` para los tipos y de su framework respectivo para el renderizado.

## Errores a añadir en `error-catalog.ts`

```ts
SECTION_NOT_FOUND:        { httpStatus: 404, level: 'warn', defaultMessage: 'Sección no encontrada.' },
SECTION_ALREADY_EXISTS:   { httpStatus: 409, level: 'warn', defaultMessage: 'Ya existe una sección con ese código en ese scope.' },
SECTION_CYCLE:            { httpStatus: 422, level: 'warn', defaultMessage: 'La jerarquía crearía un ciclo.' },
SECTION_SCOPE_MISMATCH:   { httpStatus: 422, level: 'warn', defaultMessage: 'El scope del hijo no es compatible con el del padre.' },
SECTION_IN_USE:           { httpStatus: 409, level: 'warn', defaultMessage: 'La sección tiene subsecciones activas.' },
```

## Preguntas abiertas

1. **Cache del árbol**: el árbol filtrado se podría cachear con ETag por usuario+scope. Posponer hasta que haya un problema real de rendimiento.
2. **Reorden masivo** (`PUT /sections/reorder`): endpoint para reordenar múltiples secciones en una sola petición. Posponer hasta tener UI de drag-and-drop.
3. **apiRequirements como FK real vs JSON**: guardar como `Json?` es más flexible pero pierde integridad referencial. Dado que los códigos de `ApiSection` son estables, JSON es suficiente para Phase 1.

## Checklist de aceptación

### Package @core/sections
- [ ] `packages/sections/package.json` con nombre `@core/sections`
- [ ] Tipos exportados: `Section`, `SectionTreeNode`, `SectionScope`, `SectionAccessType`
- [ ] `defineSection()` acepta la estructura anidada y la devuelve tipada
- [ ] `walkTree()`, `findSection()`, `flattenTree()` funcionan con árboles anidados
- [ ] Sin dependencias de runtime fuera de TypeScript

### Migración Prisma
- [ ] Modelos `Section`, `RoleSectionAccess`, `UserSectionAccess` en `schema.prisma`
- [ ] Enums `SectionScope`, `SectionAccessType` en el schema
- [ ] Migración `add_sections` aplicada en local sin errores
- [ ] Índice `(scope, isActive, order)` en `section`

### Módulo backend
- [ ] `GET /sections/tree?scope=BACKOFFICE` devuelve árbol filtrado por permisos del usuario autenticado
- [ ] CRUD completo para admin: create, update, list, get, delete (soft)
- [ ] Endpoints de acceso por rol y por usuario
- [ ] Validación de ciclos en jerarquía
- [ ] Validación de unicidad `(code, scope)`
- [ ] Aparece en Swagger con todos los endpoints documentados

### Seed
- [ ] `sections.seed.ts` crea las secciones iniciales del backoffice
- [ ] Rol admin tiene GRANT en todas las secciones

## Relación con otras tareas

| Tarea | Dependencia |
|---|---|
| TASK-30 (backoffice scaffold) | Sidebar hardcoded en Phase 1; se reemplaza con el árbol de secciones en Phase 2 |
| TASK-37 (forms spec) | `Section` puede registrarse como `FormRepository` para selectores de sección en formularios (Phase 3) |
