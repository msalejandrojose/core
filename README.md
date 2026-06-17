# core

**Base sobre la que se construye el resto de proyectos.** Este monorepo concentra la API, los frontends y las librerías compartidas que arrancan cualquier producto nuevo. La idea es no reinventar autenticación, IAM, emails transaccionales, cliente tipado, componentes UI ni infraestructura en cada repo: se parte de aquí y se extiende.

Stack: **pnpm workspaces + NestJS + Prisma 7 + MySQL** en el backend; **React (Vite) + Astro + Ionic** en los frontends; **Docker** para infra local.

---

## Estructura

```
core/
├── apps/                  # cosas desplegables
│   ├── api/               # NestJS — backend API-first con Swagger en /docs
│   ├── backoffice/        # React + Vite (panel de administración)
│   ├── web/               # Astro (sitio público)
│   └── mobile/            # Ionic + React (PWA + iOS/Android)
├── packages/              # librerías internas que consumen las apps
│   ├── api-client/        # cliente TS generado desde el OpenAPI de la API
│   ├── shared-types/      # tipos / DTOs / schemas compartidos
│   ├── ui/                # componentes React compartidos
│   ├── forms/             # primitivas y validación de formularios
│   └── config/            # tsconfig / eslint / prettier base
├── docker/                # stack local (MySQL + API)
├── run.sh                 # entrypoint: ./run.sh [db|full]
└── pnpm-workspace.yaml
```

---

## Requisitos

- **Node 24 LTS** (hay un `.nvmrc`). Prisma 7 no soporta Node 23.
- **pnpm 10.** No uses `npm` ni `yarn`: rompen el lockfile.
- **Docker** + Docker Compose para la BBDD local.

---

## Arranque rápido

```bash
# 1. Dependencias
nvm use
pnpm install

# 2. Variables de entorno de la API
cp apps/api/.env.example apps/api/.env

# 3. Levanta MySQL en local
./run.sh

# 4. Aplica migraciones y arranca la API en watch mode
pnpm --filter @core/api prisma:migrate
pnpm dev:api
```

La API queda en `http://localhost:3000` y la documentación OpenAPI en `http://localhost:3000/docs`.

Para validar la imagen Docker de la API end-to-end:

```bash
./run.sh full
```

---

## Scripts útiles

| Comando | Para qué |
|---|---|
| `pnpm dev:api` | API en watch mode (regenera el cliente Prisma antes de arrancar). |
| `pnpm build:api` | Build de producción de la API. |
| `pnpm --filter @core/api prisma:migrate` | Crear/aplicar migración en dev. |
| `pnpm --filter @core/api prisma:studio` | GUI de Prisma. |
| `./run.sh` | Solo MySQL (desarrollo backend con hot reload). |
| `./run.sh full` | MySQL + API dockerizada. |

---

## Arquitectura de la API

La API sigue una **arquitectura hexagonal no estricta**: cada feature vive en `apps/api/src/modules/<feature>/` con `domain/`, `application/` (use cases + ports) e `infrastructure/` (Prisma + HTTP). Pragmática, sin abstracciones vacías; el detalle está en `.claude/skills/core-architecture/SKILL.md`.

Lo que ya viene resuelto:

- **IAM completo** — usuarios, roles, permisos y secciones de API.
- **Email transaccional** — provider, verificación de cuenta y reset de contraseña.
- **Persistencia** — Prisma 7 sobre MySQL, con `PrismaService` global.
- **Documentación** — Swagger autogenerado desde los DTOs.

---

## Variables de entorno (API)

Convención propia (inversa a Vite/Next):

| Archivo | Contiene | Git |
|---|---|---|
| `apps/api/.env` | Secretos locales (DB password, JWT secret, etc.) | **Gitignored** |
| `apps/api/.env.local` | Defaults no-secretos del equipo | **Committed** |
| `apps/api/.env.example` | Plantilla de claves | **Committed** |

`DATABASE_URL` y credenciales de MySQL van en `.env` y deben coincidir con `docker/.env`.

---

## Añadir cosas

- **Una feature nueva en la API** → crea un módulo en `apps/api/src/modules/<feature>/` siguiendo el patrón hexagonal e impórtalo en `app.module.ts`. Detalles paso a paso en la skill de arquitectura.
- **Una app frontend** → inicialízala con la CLI oficial dentro de `apps/`, renombra a `@core/<app>` en su `package.json` y vuelve a `pnpm install` desde la raíz.
- **Un package compartido** → crea `packages/<nombre>` con `"name": "@core/<nombre>"` y consúmelo desde otras apps con `@core/<nombre>@workspace:*`.

---

## Convenciones que importan

- Nombres de paquete: `@core/<nombre>`.
- Nunca commitear `apps/api/src/generated/` (cliente Prisma).
- No exponer entidades de dominio por HTTP: siempre mapper → DTO con `@ApiProperty`.
- La API conecta con un usuario MySQL no-root (principio de menor privilegio); root solo para administración.

