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
├── docker/                # stack local (MySQL + API + proxy Caddy)
├── stack.config.json      # qué piezas componen el stack + subdominios + puertos
├── run.sh                 # entrypoint: ./run.sh [db|full|api|backoffice|web|mobile]
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

## Composición del stack y URLs por subdominio

Qué piezas componen el proyecto (api, backoffice, web, mobile), qué subdominio
lleva cada una bajo **`aj-local.es`** y en qué puerto interno escucha se define de
forma declarativa en **`stack.config.json`** (validado por
`packages/config/stack.schema.json`). Marca una pieza con `"enabled": false` para
que no se construya, no se levante ni se cablee en las demás.

```jsonc
{
  "domains": { "base": "aj-local.es", "localBase": "aj-local.es" },
  "parts": {
    "api":        { "enabled": true,  "subdomain": "api",   "internalPort": 3000, "runMode": "docker" },
    "backoffice": { "enabled": true,  "subdomain": "admin", "internalPort": 4200, "runMode": "host" },
    "web":        { "enabled": false, "subdomain": "www",   "internalPort": 4300, "runMode": "host" },
    "mobile":     { "enabled": false, "subdomain": "app",   "internalPort": 4400, "runMode": "host" }
  }
}
```

`run.sh` lee esa config y, según el modo, regenera `docker/Caddyfile`, levanta los
servicios Docker necesarios y un **reverse proxy (Caddy)** que enruta cada
subdominio a su pieza. Las URLs van **sin puerto** (`http://api.aj-local.es`,
`http://admin.aj-local.es`): Caddy enruta por host. Las piezas con
`runMode: "host"` (los frontends en `pnpm dev`/HMR) corren fuera de Docker y el
proxy las alcanza vía `host.docker.internal`.

### Resolución DNS local — `/etc/hosts`

No hace falta registrar dominio. `run.sh` detecta qué entradas faltan en
`/etc/hosts` para las piezas activas y muestra la línea lista para pegar:

```
127.0.0.1 api.aj-local.es admin.aj-local.es
```

Con `./run.sh --setup-hosts` las añade automáticamente (con `sudo`).

### Cableado entre piezas

`run.sh` deriva las URLs de la config y las inyecta:

- **API** → `CORS_ORIGINS` (lista de URLs de los frontends habilitados); la lee
  `main.ts` en `app.enableCors`.
- **Backoffice (Vite)** → `VITE_API_URL`.
- **Web (Astro)** → `PUBLIC_API_URL`.

---

## Scripts útiles

| Comando | Para qué |
|---|---|
| `pnpm dev:api` | API en watch mode (regenera el cliente Prisma antes de arrancar). |
| `pnpm build:api` | Build de producción de la API. |
| `pnpm --filter @core/api prisma:migrate` | Crear/aplicar migración en dev. |
| `pnpm --filter @core/api prisma:studio` | GUI de Prisma. |
| `pnpm --filter @core/config test` | Tests del loader de `stack.config.json`. |
| `./run.sh` | Solo MySQL (desarrollo backend con hot reload). |
| `./run.sh full` | Todas las piezas habilitadas (API dockerizada + proxy). |
| `./run.sh api` | MySQL + API dockerizada + proxy. |
| `./run.sh backoffice` | MySQL + proxy (el backoffice se sirve desde el host). |
| `./run.sh --setup-hosts` | Añade a `/etc/hosts` los subdominios que falten. |
| `./dev.sh` | Arranca el stack Docker (`run.sh full`) **y** abre un panel/terminal por pieza habilitada. |
| `./dev.sh --mode terminal` | Igual, pero en ventanas nativas (macOS Terminal.app / Linux gnome-terminal…) en vez de tmux. |
| `./dev.sh --no-docker` | Solo abre los paneles de las piezas (no relanza Docker). |

> Requiere [`jq`](https://jqlang.github.io/jq/) para leer `stack.config.json`.
>
> `dev.sh` levanta la API dockerizada y, por cada pieza en `runMode: host`
> (backoffice, web, mobile…), abre un panel siguiendo sus logs o corriendo su
> `pnpm … dev`. Por defecto usa **tmux** (una ventana con paneles en mosaico);
> `--mode terminal` abre ventanas nativas. Para incluir la app **mobile**, ponla
> como `"enabled": true` en `stack.config.json`.

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

## Secretos de producción (SOPS + age)

Los secretos que necesita cada app en cada entorno (prod, staging...) viven
**cifrados** en `secrets/<proyecto>/<entorno>.env`, cifrados con
[SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age).
Se pueden commitear sin riesgo: sin la clave privada correspondiente son
ilegibles. El workflow de deploy (`.github/workflows/deploy.yml`) los
descifra en el runner de CI usando una clave age propia guardada solo como
GitHub Secret (`SOPS_AGE_KEY_CI`).

Detalles de setup (generar tu clave, editar un secreto, revocar acceso) en
[`secrets/README.md`](./secrets/README.md).

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

