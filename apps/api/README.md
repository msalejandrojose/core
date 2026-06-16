<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Sistema de excepciones y códigos de error

La API centraliza el manejo de errores en `src/shared/`:

- **`shared/errors/error-catalog.ts`**: catálogo único de códigos de error. Cada entrada define `code` (formato `DOMINIO_SUBDOMINIO_CAUSA`, p.ej. `USER_NOT_FOUND`), `httpStatus`, `level` (`info | warn | error | critical`), `defaultMessage` y opcionalmente `i18nKey`.
- **`shared/errors/domain-error.ts`**: clase base `DomainError` (sin dependencias de Nest/HTTP) para errores lanzados desde la capa `domain/` de cada módulo. Recibe un `code` del catálogo, un mensaje y un `context` opcional.
- **`shared/exceptions/app.exception.ts`**: clase `AppException extends HttpException`, pensada para lanzarse desde `application/`/`infrastructure/`. Resuelve automáticamente `httpStatus`, `level` y `message` a partir del catálogo y genera un `errorId` (UUID) único por instancia.
- **`shared/filters/app-exception.filter.ts`**: filtro global (`APP_FILTER`, registrado en `AppModule`) que captura `AppException`, `DomainError`, cualquier otra `HttpException` (p.ej. `ValidationPipe`) y errores no controlados (normalizados a `INTERNAL_UNEXPECTED` / `critical`).

### Qué hace el filtro global

1. Responde al cliente con un JSON estandarizado: `{ errorId, code, message, level, timestamp, path }`.
2. Loggea en stdout un JSON estructurado (vía Pino, ver `infrastructure/logger/structured-logger.ts`) con `errorId`, `code`, `level`, `httpStatus`, `path`, `method`, `userId` y, solo para `error`/`critical`, el `stack`. Visible con `docker compose logs api`.
3. Persiste de forma asíncrona (no bloqueante) un registro en la tabla `ErrorLog` vía `ErrorLogService`, para todo error con `level` distinto de `info`.

### Cómo agregar un nuevo código de error

1. Agregar la entrada al `ERROR_CATALOG` en `shared/errors/error-catalog.ts` con su `code`, `httpStatus`, `level` y `defaultMessage`.
2. Lanzarlo:
   - Desde `domain/`: crear (o reutilizar) una subclase de `DomainError`, p.ej. `throw new UserNotFoundError(userId)`.
   - Desde `application/`/`infrastructure/`: `throw new AppException('USER_NOT_FOUND', { context: { userId } })`.
3. No es necesario tocar el filtro global: resuelve cualquier código nuevo automáticamente a partir del catálogo.

### Niveles y su significado (contrato para el frontend)

| Level      | Uso esperado en frontend                  |
|------------|--------------------------------------------|
| `info`     | No se persiste en `ErrorLog`; feedback liviano (toast informativo). |
| `warn`     | Errores esperables (validación, recursos no encontrados, conflictos). Toast/notificación. |
| `error`    | Errores inesperados recuperables. Modal de error. |
| `critical` | Errores graves (caída de infraestructura, etc.). Pantalla completa de error. |

> Nota: al momento de escribir esto, los proyectos en `apps/backoffice`, `apps/web` y `apps/mobile` no tienen código aún, por lo que el consumo de este contrato desde el frontend queda pendiente de implementación cuando esas apps existan.

## Convenciones HTTP

### Recursos individuales (sin envelope)

`GET /users/:id`, `POST /auth/login`, etc. devuelven el DTO plano directamente:

```json
{ "id": "...", "email": "...", "firstName": "..." }
```

### Listados — cursor (default)

Todos los listados usan paginación por cursor con ordenación `createdAt DESC`.
El cursor es opaco (base64url), estable bajo inserciones concurrentes.

```
GET /v1/users?limit=20
200 OK
{
  "data": [ { "id": "...", "email": "...", ... } ],
  "meta": {
    "limit": 20,
    "nextCursor": "eyJpZCI6Ii4uLiIsImNyZWF0ZWRBdCI6Ii4uLiJ9",
    "hasMore": true
  }
}
```

- `nextCursor` es `null` cuando `hasMore === false`.
- Para la primera página: omite el parámetro `cursor`.
- Para la siguiente: `?cursor=<nextCursor de la respuesta anterior>`.
- Cursor inválido → `400 INVALID_CURSOR`.

**Query params comunes:**

| Param    | Tipo     | Default | Notas                          |
|----------|----------|---------|--------------------------------|
| `limit`  | `number` | `20`    | Min `1`, max `100`             |
| `cursor` | `string` | —       | Opaco base64url; omitir para primera página |

### Listados — offset (opt-in)

Solo endpoints que necesiten jump-to-page (backoffice con tabla). Usa
`PaginationQueryDto` (`page`, `limit`, `sort`, `order`) y `PaginatedResponseDto<T>`.

```
GET /v1/audit-log?page=2&limit=20
200 OK
{
  "data": [ ... ],
  "meta": { "page": 2, "limit": 20, "total": 437, "totalPages": 22 }
}
```

### Errores

Todos los errores tienen la misma forma independientemente del tipo de listado:

```json
{ "errorId": "...", "code": "INVALID_CURSOR", "message": "...", "level": "warn", "timestamp": "...", "path": "..." }
```

### Implementación en NestJS

- **Cursor:** usa `CursorPaginationQueryDto`, `CursorPaginatedResponseDto<T>` y `@ApiCursorPaginatedResponse(ItemDto)` de `shared/pagination/`.
- **Offset:** usa `PaginationQueryDto`, `PaginatedResponseDto<T>` y `@ApiPaginatedResponse(ItemDto)` de `shared/http/`.
- El `meta` lo construye el controller, no el use-case (es detalle HTTP).
- Los use-cases y repositorios devuelven `CursorPage<T>` (cursor) o `PaginatedResult<T>` (offset).

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
