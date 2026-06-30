---
name: core-architecture
description: Authoritative reference for the layout, conventions, and architectural decisions of the `core` monorepo (pnpm workspaces + NestJS API + planned React/Astro/Ionic frontends + shared packages + Prisma 7 + MySQL/Docker). Use this skill whenever the user is working on this repo and you need to know where files go, how to scaffold a new feature module in the API, how to add a Prisma model, how to add a new app or package to the workspace, where env vars live, or how the Docker stack is wired. Trigger generously — even for questions that sound generic ("add a users endpoint", "create a new module", "where does the controller go", "how do I add a migration", "where are env vars defined") because the answer depends on this repo's hexagonal-non-strict convention, not on NestJS defaults.
---

# Core monorepo — architecture reference

This skill captures the conventions established for this repo. Use it as the source of truth when extending the codebase. If something here disagrees with what you see in the code, the **code wins** — update this file and tell the user.

## 1. High-level layout

```
core/
├── apps/                    # things that get deployed
│   ├── api/                 # NestJS backend (API-first, expone OpenAPI/Swagger)
│   ├── backoffice/          # React + Vite (backoffice interno)
│   ├── web/                 # Astro 5 static site — sitio público (@core/web)
│   └── mobile/              # Ionic + React PWA + iOS/Android (planned, vacío)
├── packages/                # librerías internas que consumen las apps
│   ├── api-client/          # cliente TS generado desde el OpenAPI del backend (vacío)
│   ├── shared-types/        # tipos / DTOs / schemas compartidos (vacío)
│   ├── ui/                  # componentes React compartidos (vacío, opcional)
│   └── config/              # tsconfig base, eslint, prettier (vacío)
├── docker/                  # tooling de infra local
│   ├── mysql/               # Dockerfile para MySQL + init scripts
│   ├── docker-compose.yml   # mysql service + api service (profile "full")
│   └── .env.example         # plantilla de credenciales locales
├── run.sh                   # entrypoint: ./run.sh [db|full]
├── pnpm-workspace.yaml      # incluye apps/* y packages/*
├── package.json             # root, privado; tiene scripts dev:api / build:api
├── .nvmrc                   # Node 24
└── .dockerignore            # excluye node_modules, dist, .env, etc.
```

**Gestor de paquetes:** pnpm 10. El workspace es declarativo (`pnpm-workspace.yaml`); cada paquete tiene su propio `package.json`. **Nunca** uses npm o yarn aquí — romperás el lockfile.

**Node:** 24 LTS. Está en `.nvmrc`. Prisma 7 requiere LTS; Node 23 NO está soportado.

**Cómo se llaman los paquetes:** `@core/<nombre>`. La API es `@core/api`. Los filtros de pnpm usan ese nombre: `pnpm --filter @core/api <comando>`.

## 2. La API (`apps/api/`) — arquitectura hexagonal no estricta

### 2.1 Layout interno

```
apps/api/
├── prisma/
│   └── schema.prisma            # modelos Prisma (single source of truth de datos)
├── prisma.config.ts             # config de la CLI (path al schema + DATABASE_URL)
├── src/
│   ├── main.ts                  # bootstrap: NestFactory + Swagger
│   ├── app.module.ts            # composition root: ConfigModule + PrismaModule
│   │
│   ├── shared/                  # transversal a TODA la app (no lógica de negocio)
│   │   ├── config/              # validación de env, factories
│   │   ├── filters/             # exception filters globales
│   │   ├── pipes/               # validation/transform pipes
│   │   ├── guards/              # auth guards, role guards
│   │   ├── interceptors/        # logging, timeout, transform
│   │   └── decorators/          # @CurrentUser, @Public, etc.
│   │
│   ├── infrastructure/          # adapters de infra COMPARTIDOS por toda la app
│   │   ├── database/prisma/     # PrismaModule + PrismaService (global)
│   │   └── logger/              # Pino/Winston (vacío, vendrá luego)
│   │
│   ├── modules/                 # 1 carpeta = 1 bounded context
│   │   └── <feature>/           # ver §2.2
│   │
│   └── generated/               # ⚠️ código auto-generado por Prisma. GITIGNORED.
│       └── prisma/              # no editar a mano; se regenera con `prisma generate`
│
├── tsconfig.json
├── tsconfig.build.json          # excluye prisma.config.ts para que dist/main.js quede en la raíz
├── Dockerfile                   # multi-stage, contexto = raíz del repo
├── .env                         # secretos locales (gitignored)
├── .env.local                   # defaults no-secretos del equipo (committed)
└── .env.example                 # plantilla de .env
```

### 2.2 Estructura de un módulo de feature

Cada feature vive en `src/modules/<feature>/` y aplica hexagonal **por dentro**. Pragmática, no estricta. Si algo es trivial, omítelo — no crees abstracciones vacías para cumplir la forma.

```
src/modules/<feature>/
├── domain/                      # núcleo, SIN dependencias de Nest, Prisma o frameworks
│   ├── entities/                # clases puras TS (no son modelos Prisma)
│   ├── value-objects/           # Email, Money, etc. (opcional, solo si aportan)
│   └── errors/                  # excepciones de dominio (extends Error)
│
├── application/                 # orquestación, no toca infra directamente
│   ├── ports/                   # interfaces: <Feature>RepositoryPort, MailerPort...
│   ├── use-cases/               # un caso de uso por archivo (CreateUserUseCase)
│   └── dto/                     # input/output de los use cases (NO son HTTP DTOs)
│
├── infrastructure/              # implementaciones de los puertos
│   ├── persistence/             # PrismaUserRepository implements UserRepositoryPort
│   ├── http/                    # controllers + request/response DTOs con @ApiProperty
│   └── mappers/                 # domain ↔ prisma model ↔ HTTP DTO
│
└── <feature>.module.ts          # cablea puertos a sus adapters vía DI tokens
```

### 2.3 Reglas de oro de la arquitectura

Pocas, las que importan:

1. **`domain/` no importa nada de fuera del módulo** salvo otros módulos de domain. Cero Nest, cero Prisma, cero HTTP. Si lo intentas, casi siempre el diseño está mal.
2. **`application/` solo conoce sus propios `ports/`**, nunca implementaciones concretas. Inyecta los ports vía DI tokens.
3. **`infrastructure/` puede importar lo que necesite** — es donde viven los detalles. Aquí van decoradores de Nest, llamadas a Prisma, http específico.
4. **El módulo cablea los tokens** en `<feature>.module.ts`. Ejemplo:
   ```ts
   { provide: USER_REPOSITORY, useClass: PrismaUserRepository }
   ```
   Y luego en el use case:
   ```ts
   constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepositoryPort) {}
   ```
5. **Los DTOs HTTP NO son los DTOs de application.** Mapper entre los dos. Si para un caso trivial son idénticos, vale duplicar — no compartas la clase por ahorrar líneas, lo pagas en acoplamiento.
6. **"No estricta" significa:** sin ESLint que prohíba imports cruzados (de momento). Si un caso trivial no necesita value-object, entity y DTO separados, no los inventes.

### 2.4 Cómo añadir un módulo de feature nuevo

Cuando el usuario diga "añade el módulo X" / "necesito un endpoint para Y":

1. Crear carpetas siguiendo §2.2.
2. Si lleva persistencia: añadir el modelo a `prisma/schema.prisma`, correr `pnpm --filter @core/api prisma:migrate -- --name add_<feature>`.
3. Crear los archivos en este orden (de adentro hacia afuera):
   - `domain/entities/<feature>.entity.ts`
   - `application/ports/<feature>-repository.port.ts` (interface)
   - `application/use-cases/<verbo>-<feature>.use-case.ts`
   - `infrastructure/persistence/prisma-<feature>.repository.ts` (implements el port)
   - `infrastructure/mappers/<feature>.mapper.ts`
   - `infrastructure/http/dto/<verbo>-<feature>.dto.ts` (con `@ApiProperty`)
   - `infrastructure/http/<feature>.controller.ts` (con `@ApiTags`, `@ApiOperation`)
   - `<feature>.module.ts` — wire everything
4. Importar el module en `app.module.ts`.
5. Reabrir Swagger en `/docs` para confirmar que el endpoint aparece tipado.

## 3. Prisma 7 — patrón concreto

Esta parte es delicada porque Prisma 7 cambió el patrón respecto a v6. Sigue exactamente lo que está en el código.

- **Generador**: `provider = "prisma-client"` (no `prisma-client-js`), con `moduleFormat = "cjs"` y `output = "../src/generated/prisma"`.
- **`moduleFormat = "cjs"` es obligatorio.** Sin él, el generador emite `import.meta.url` y Node 22+ detecta el archivo como ESM aunque el resto sea CJS, rompiendo en runtime con `exports is not defined in ES module scope`.
- **`datasource db`** solo lleva `provider = "mysql"`. **NO** lleva `url`. Eso vive en `prisma.config.ts`.
- **`prisma.config.ts`** carga `dotenv` y expone `datasource.url` para la CLI. La CLI lo busca en el cwd, así que los comandos prisma se ejecutan desde `apps/api/`.
- **Runtime**: `PrismaService` construye un `PrismaMariaDb` adapter desde `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` y se lo pasa al constructor de `PrismaClient`. No usamos `DATABASE_URL` en runtime.
- **`PrismaModule` es `@Global()`** — cualquier feature module puede inyectar `PrismaService` sin importar el módulo.
- **Cliente generado** vive en `apps/api/src/generated/prisma/` y está gitignored. Se regenera en `prebuild` y `prestart:dev`. **Nunca commitear** este directorio.

### Añadir una migración

```bash
pnpm --filter @core/api prisma:migrate -- --name <nombre_descriptivo>
```

Esto crea la migración, la aplica a la BBDD local (que tiene que estar levantada con `./run.sh`) y regenera el cliente.

### Scripts disponibles en `@core/api`

| Script | Para qué |
|---|---|
| `pnpm dev:api` | Watch mode (regenera Prisma client antes de arrancar). |
| `pnpm build:api` | Build producción (incluye `prisma generate`). |
| `pnpm --filter @core/api prisma:generate` | Regenerar cliente. |
| `pnpm --filter @core/api prisma:migrate` | Crear/aplicar migración en dev. |
| `pnpm --filter @core/api prisma:migrate:deploy` | Aplicar migraciones (prod/CI). |
| `pnpm --filter @core/api prisma:studio` | GUI de Prisma. |
| `pnpm --filter @core/api prisma:format` | Formatear `schema.prisma`. |

## 4. Variables de entorno

Convención del backend (`apps/api/`):

| Archivo | Contiene | Git | Prioridad al cargar |
|---|---|---|---|
| `.env` | Secretos locales (DB_PASSWORD, JWT_SECRET, DATABASE_URL, etc.) | **Gitignored** | 1 (gana) |
| `.env.local` | Defaults no-secretos del equipo (NODE_ENV, PORT, DB_HOST, DB_NAME, DB_PORT…) | **Committed** | 2 |
| `.env.example` | Plantilla de qué claves debe tener `.env` | **Committed** | — |

⚠️ **Esta convención es la INVERSA de Vite/Next.js**, donde `.env.local` es el gitignored. Si añades env vars en `apps/backoffice/` (Vite) o `apps/web/` (Astro), usa los convenios de esas herramientas — el override del root `.gitignore` solo aplica a `apps/api/.env.local`.

El override está en `.gitignore`:
```
.env
.env.local
!apps/api/.env.local
```

**`ConfigModule.forRoot`** en `app.module.ts` carga ambos archivos como `envFilePath: ['.env', '.env.local']`. El primer file de la lista gana.

**Dentro del contenedor Docker** ningún `.env*` se copia (lo filtra `.dockerignore`). Las variables vienen inyectadas por `docker-compose.yml` o por el cloud provider.

**Para que la API conecte a la BBDD local:** `apps/api/.env` debe tener `DATABASE_URL`, `DB_USER`, `DB_PASSWORD` que **coincidan** con `docker/.env`.

## 5. Docker stack

`docker/docker-compose.yml` define tres servicios:

| Servicio | Profiles | Cuándo se levanta |
|---|---|---|
| `mysql` | (ninguno) | Siempre con `./run.sh` |
| `api` | `api`, `full` | `./run.sh api` o `./run.sh full` |
| `proxy` (Caddy) | `api`, `backoffice`, `web`, `full` | Con cualquier pieza que sirva tráfico web |

**Composición declarativa del stack** (`stack.config.json` en la raíz, validado por
`packages/config/stack.schema.json`): define qué piezas (`api`/`backoffice`/`web`/`mobile`)
están `enabled`, su `subdomain` bajo `aj-local.es`, su `internalPort` y su `runMode`
(`docker` para la API, `host` para frontends en `pnpm dev`). El helper TS está en
`packages/config` (`loadStackConfig`, `enabledParts`, `getUrl`).

**`./run.sh`** (en la raíz) lee `stack.config.json`, regenera `docker/Caddyfile`
(gitignored), comprueba `/etc/hosts` y deriva el cableado por env (`CORS_ORIGINS`
para la API, `VITE_API_URL`/`PUBLIC_API_URL` para los frontends). Modos:
- `./run.sh` (default `db`) → solo BBDD. Para desarrollar el backend con `pnpm dev:api`.
- `./run.sh full` → todas las piezas habilitadas (API dockerizada + proxy).
- `./run.sh api|backoffice|web|mobile` → esa pieza + MySQL (+ proxy si sirve web).
- `./run.sh --setup-hosts` → añade a `/etc/hosts` los subdominios que falten.

Requiere `jq`. Las URLs van sin puerto: Caddy enruta por host (`api.aj-local.es`,
`admin.aj-local.es`); los frontends `host` se alcanzan vía `host.docker.internal`.
La API lee `CORS_ORIGINS` en `main.ts` (`app.enableCors`).

**Credenciales de MySQL** en `docker/.env`:
- Root: `MYSQL_ROOT_USER=root`, `MYSQL_ROOT_PASSWORD`
- App user (la que usa la API): `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`

**Volumen persistente**: `core-mysql-data`. Los datos sobreviven a `docker compose down`. Para borrar todo: `docker compose -f docker/docker-compose.yml --profile full down -v`.

**Healthcheck** de MySQL (`mysqladmin ping`). El servicio `api` declara `depends_on.mysql.condition: service_healthy`, así que la API espera a que MySQL esté listo antes de arrancar.

### El Dockerfile de la API

`apps/api/Dockerfile`, multi-stage:

- **Builder** (`node:24-alpine`): instala deps del workspace de la api (`--filter @core/api...`), copia `prisma/` antes del install para que la postinstall vea el schema, corre `prebuild` (que ejecuta `prisma generate`) + `nest build`, y empaqueta con `pnpm deploy --legacy --prod /out`.
- **Runtime** (`node:24-alpine`, usuario `app` no-root): solo copia `node_modules`, `dist` y `package.json` de `/out`. Imagen final ~640MB. Arranca con `node dist/main.js`.

**Build context = raíz del repo**, no `apps/api/`. La pipeline:
```bash
docker build -f apps/api/Dockerfile -t core-api:latest .
```

La imagen lee `process.env.PORT` así que funciona en Cloud Run, ECS, Render, Fly, Railway sin cambios.

## 6. apps/web — sitio público Astro

`apps/web` es el sitio estático público del monorepo. Nombre de paquete: `@core/web`. Implementado con **Astro 5 (SSG)**, **Tailwind 4** y **React** para islands interactivos.

### Stack concreto

| Pieza | Decisión |
|---|---|
| Framework | Astro 5 (`output: 'static'`) |
| Estilos | Tailwind 4 vía `@tailwindcss/vite` (config en CSS, no en `tailwind.config.ts`) |
| Islands | `@astrojs/react` — React 19 solo donde haga falta interactividad |
| Tipografía | Fraunces Variable (display) + Inter Variable (body) — `@fontsource-variable/*` |
| Sitemap | `@astrojs/sitemap` — genera `sitemap-index.xml` en build |
| Type-check | `@astrojs/check` (`pnpm --filter @core/web check`) |

### Estructura interna de apps/web

```
apps/web/
├── public/                  # favicon.svg, robots.txt
├── src/
│   ├── components/
│   │   ├── Seo.astro        # OG + Twitter cards
│   │   ├── ui/              # Button, Container, Link (Astro)
│   │   ├── sections/        # Header, Footer, Hero (Astro)
│   │   └── islands/         # ContactForm.tsx (React, client:load)
│   ├── layouts/
│   │   ├── BaseLayout.astro       # html + head + anti-flash dark-mode script
│   │   └── MarketingLayout.astro  # Header + Footer + slot
│   ├── pages/               # index.astro, contacto.astro, 404.astro
│   ├── lib/
│   │   ├── api.ts           # fetch wrapper → PUBLIC_API_URL
│   │   └── seo.ts           # buildSeoMeta helper
│   ├── styles/
│   │   ├── globals.css      # @import tailwindcss + @theme (tokens light) + @layer base
│   │   └── tokens.css       # overrides dark mode (prefers-color-scheme + data-theme)
│   └── content/config.ts    # Content Collections preparado, vacío
├── astro.config.mjs
├── tsconfig.json            # extends astro/tsconfigs/strict, TS ~5.7
├── .env.example
└── README.md
```

### Design tokens

Paleta **greige + terracota/clay**. Los tokens se definen en `@theme` dentro de `globals.css` (Tailwind 4 los convierte en CSS custom properties). El dark mode sobrescribe esas variables en `tokens.css` via `prefers-color-scheme` y `[data-theme='dark']`.

Clases Tailwind generadas: `bg-brand`, `text-fg`, `bg-bg-muted`, `border-border`, `rounded-md`, etc.

### Variables de entorno de la web

⚠️ **Convención INVERSA a `apps/api/`**: aquí `.env.local` está gitignored (convención Vite/Astro). Solo las variables con prefijo `PUBLIC_` se exponen al browser.

| Variable | Uso |
|---|---|
| `PUBLIC_API_URL` | URL de la API (usada en `src/lib/api.ts` y el island de contacto) |
| `PUBLIC_SITE_URL` | URL del propio sitio (sitemap + OG tags) |

`run.sh` inyecta `PUBLIC_API_URL` derivado de `stack.config.json` cuando se levanta con `./run.sh web`.

### Wiring con el stack local

- `stack.config.json`: `"web": { "enabled": true, "subdomain": "www", "internalPort": 4321, "runMode": "host" }`
- Caddy enruta `http://www.aj-local.es:80` → `host.docker.internal:4321` (dev server Astro).
- `./run.sh web` levanta MySQL + proxy. La web corre en el host: `pnpm dev:web`.
- `./run.sh --setup-hosts` añade `www.aj-local.es` a `/etc/hosts`.

### Scripts

```bash
pnpm dev:web       # dev server en localhost:4321
pnpm build:web     # astro check + astro build → apps/web/dist/
pnpm preview:web   # sirve dist/ localmente
```

### Añadir una página nueva

1. Crear `src/pages/<nombre>.astro`.
2. Usar `MarketingLayout` (header + footer) o `BaseLayout` (solo html + SEO).
3. Pasar `title` y `description` al layout — el componente `Seo.astro` genera todo el head.

### Añadir un island React

1. Crear el componente en `src/components/islands/<Nombre>.tsx`.
2. Importarlo en la página Astro y añadir directiva `client:load` (o `client:visible` si no es above-the-fold).
3. Para acceder a la API usar `getApiUrl()` o `apiFetch()` de `src/lib/api.ts`.

## 7. Añadir una nueva app o package al workspace

### Una nueva app (frontend)

1. Inicializa con la CLI oficial del framework **dentro de `apps/`**:
   - Backoffice: `pnpm create vite apps/backoffice --template react-ts`
   - Web: `pnpm create astro@latest apps/web`
   - Mobile: `pnpm create ionic@latest apps/mobile --type=react`
2. Edita `apps/<app>/package.json` → renombra a `@core/<app>`.
3. `pnpm install` desde la raíz — pnpm lo descubre por el workspace.
4. Si la app va a consumir la API, depende de `@core/api-client` (cuando lo creemos): `pnpm --filter @core/<app> add @core/api-client@workspace:*`.
5. Añade scripts a la raíz si quieres: `dev:<app>`, `build:<app>`.

### Un nuevo package compartido

1. `mkdir packages/<nombre> && cd packages/<nombre>`
2. Crea `package.json` con `"name": "@core/<nombre>"`, `"version": "0.0.0"`, `"private": true`, y los `main`/`types`/`exports` que corresponda.
3. `pnpm install` desde la raíz.
4. Otras apps lo consumen con `@core/<nombre>@workspace:*`.

## 7. Patrones que NO usamos / decisiones tomadas

Cosas que pueden parecer naturales pero NO encajan con la convención:

- **No usamos `@nestjs/typeorm`.** Elegimos Prisma 7. No mezcles ORMs.
- **No usamos barrel exports (`index.ts`)** salvo el caso obvio del cliente Prisma. Imports relativos directos para que el grafo de dependencias sea transparente.
- **No commits del cliente Prisma generado.** Está gitignored intencionalmente.
- **No expongas entidades de dominio directamente por HTTP.** Mapper → DTO con `@ApiProperty`.
- **No uses `MYSQL_ROOT_*` desde la API.** La API conecta con el `MYSQL_USER` no-root (principio de menor privilegio). Root es solo para administración.
- **No metas `DATABASE_URL` en `.env.local`.** Contiene credenciales → va en `.env`.
- **No corras `npm` o `yarn`.** Solo `pnpm`.
- **No instales Prisma globalmente.** Está en `devDependencies` de `@core/api`, usa `pnpm --filter @core/api exec prisma ...`.

## 8. Quick checks antes de proponer cambios

Para mantener coherencia, antes de implementar verifica:

- [ ] Si tocas algo de la API, ¿el cambio respeta la frontera `domain` ⟂ Nest/Prisma?
- [ ] Si añades un endpoint, ¿está decorado con `@ApiTags`/`@ApiOperation` para que aparezca bien en `/docs`?
- [ ] Si añades una env var nueva, ¿la pusiste en el archivo correcto (`.env` secreta vs `.env.local` no-secreta) y la mencionaste en `.env.example`?
- [ ] Si añades una dep al backend, ¿usaste `pnpm --filter @core/api add`?
- [ ] Si tocas el schema de Prisma, ¿corriste `prisma:migrate` y verificaste que `prisma generate` produce el cliente sin errores?
- [ ] Si tocas el Dockerfile o las deps, ¿hiciste `docker build` para confirmar que sigue construyéndose?

## 9. Convención de paginación y response envelope

### Recursos individuales — sin envelope

`GET /users/:id`, `POST /auth/login`, etc. devuelven el DTO plano directamente. Sin envolver. Tipado con `@ApiOkResponse({ type: UserResponseDto })`.

### Listados — cursor (default)

Todos los listados nuevos usan paginación por cursor. Infraestructura en `shared/pagination/`.

**Shape de respuesta:**
```json
GET /v1/users?limit=20
{
  "data": [ { "id": "...", "email": "..." } ],
  "meta": { "limit": 20, "nextCursor": "eyJ...", "hasMore": true }
}
```
- `nextCursor` es `null` cuando `hasMore === false`.
- Primera página: omite `cursor`. Siguientes: `?cursor=<nextCursor>`.
- Cursor inválido/manipulado → `400 INVALID_CURSOR` (el `DomainErrorFilter` lo captura).

**Query DTO:** extiende `CursorPaginationQueryDto` (campos: `limit`, `cursor`). Añade los filtros propios del recurso.

**Controller:**
```typescript
@Get()
@ApiCursorPaginatedResponse(UserResponseDto)
async list(@Query() q: ListUsersQueryDto): Promise<CursorPaginatedResponseDto<UserResponseDto>> {
  const page = await this.listUsers.executeWithCursor({ limit: q.limit, cursor: q.cursor });
  return CursorPaginatedResponseDto.of(page.items.map(UserResponseDto.fromUser), page.nextCursor, q.limit);
}
```

**Repository port:** devuelve `CursorPage<T>` (`{ items: T[]; nextCursor: string | null }`).

**Prisma:** ordena `createdAt DESC, id ASC`. Fetch `limit + 1` para detectar `hasMore`. El cursor codifica `{ id, createdAt }` en base64url (codec en `shared/pagination/cursor.codec.ts`).

### Listados — offset (opt-in)

Solo si el endpoint necesita jump-to-page (tablas de backoffice con número de página). Documentar explícitamente que es offset. Infraestructura en `shared/http/dto/`.

**Shape de respuesta:**
```json
{ "data": [...], "meta": { "page": 2, "limit": 20, "total": 437, "totalPages": 22 } }
```

**Query DTO:** extiende `PaginationQueryDto` (campos: `page`, `limit`, `sort`, `order`).
**Controller:** usa `PaginatedResponseDto.of(items, total, page, limit)` y `@ApiPaginatedResponse(ItemDto)`.

### Regla del meta

El `meta` lo construye el **controller**, no el use-case. Los use-cases devuelven `CursorPage<T>` o `PaginatedResult<T>` (datos sin forma HTTP).

### Errores de paginación

`INVALID_CURSOR` (400 warn) está en `error-catalog.ts`. Se lanza automáticamente desde `cursor.codec.ts` cuando el cursor es inválido o ha sido manipulado.

## 10. Si esta skill se queda desactualizada

Este archivo es un *snapshot vivo*. Si encuentras que la realidad del código diverge:

1. Mira el código (manda sobre este documento).
2. Decide con el usuario si la divergencia es intencional (entonces actualiza esta skill) o accidental (entonces arregla el código).
3. Si actualizas la skill, manten la estructura: secciones numeradas, ejemplos concretos, el "por qué" detrás de cada decisión no obvia.
