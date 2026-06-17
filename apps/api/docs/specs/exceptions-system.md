# Sistema de excepciones — API

Sistema unificado de manejo de excepciones para `@core/api`. Pensado para que
toda excepción del backend pase por el mismo pipeline: respuesta JSON con
forma estable, log estructurado en stdout y persistencia opcional en BD.

> Estado: **scaffold inicial**. Implementación base en `apps/api/src/common/errors/`.

---

## 1. Vista de pájaro

```
  use case / controller
        │
        │  throw new AppException('USER_NOT_FOUND', { context: { … } })
        ▼
  GlobalExceptionFilter  ──►  log estructurado (stdout, level-aware)
        │
        ├─►  ErrorLogService.record(...)   (fire-and-forget)
        │           │
        │           └──►  Prisma → tabla error_log
        ▼
  respuesta JSON al cliente
  { errorId, code, message, level, timestamp, path, statusCode }
```

## 2. Catálogo de códigos

Vive en `apps/api/src/common/errors/error-codes.ts`. Cada código declara:

| Campo            | Descripción                                                   |
|------------------|---------------------------------------------------------------|
| `httpStatus`     | Código HTTP que devuelve el filter                            |
| `level`          | `info` \| `warn` \| `error` \| `critical`                     |
| `defaultMessage` | Mensaje en español por defecto                                |
| `i18nKey`        | (opcional) Clave para resolver el copy en el frontend         |

**Convención de naming**: `DOMINIO_SUBDOMINIO_CAUSA` (p. ej.
`AUTH_LOGIN_INVALID_CREDENTIALS`, `USER_EMAIL_ALREADY_EXISTS`).

Para añadir un código nuevo:
1. Añadir constante a `ERROR_CODES`.
2. Añadir entrada a `ERROR_CATALOG`.
3. Lanzar `new AppException('NUEVO_CODE')`.

## 3. `AppException`

Clase base que extiende `HttpException` de Nest. Cada instancia:

- Resuelve `httpStatus`, `level` y `message` desde el catálogo.
- Acepta `message` custom y `context` (payload arbitrario tipado en log/BD).
- Genera un `errorId` único (UUIDv4) para correlación end-to-end.
- Soporta `cause` (encadenado de errores nativo de ES2022).

```ts
throw new AppException('USER_NOT_FOUND');
throw new AppException('USER_EMAIL_ALREADY_EXISTS', { context: { email } });
throw new AppException('VALIDATION_FAILED', { message: 'El campo X falta' });
```

## 4. Filter global

`GlobalExceptionFilter` se registra como `APP_FILTER` desde `ExceptionsModule`
(global). Captura **todo**: `AppException`, `HttpException` (validación Nest,
4xx, etc.) y `Error` desconocido. Pipeline:

1. **Normalización**: cualquier excepción se convierte a `AppException`.
   - `HttpException` 4xx → `VALIDATION_FAILED` preservando mensaje.
   - Cualquier otra cosa → `INTERNAL_UNEXPECTED` (level `critical`).
2. **Log estructurado** (JSON en stdout) con `level` apropiado: `info`/`warn`
   sin stack, `error`/`critical` con stack.
3. **Persistencia** (best-effort, fire-and-forget) vía `ErrorLogService`.
4. **Respuesta** al cliente con el shape `ClientErrorPayload`.

### Shape de respuesta

```json
{
  "errorId": "9b1c…",
  "code": "AUTH_LOGIN_INVALID_CREDENTIALS",
  "message": "Credenciales inválidas.",
  "level": "warn",
  "timestamp": "2026-06-16T06:30:00.000Z",
  "path": "/auth/login",
  "statusCode": 401
}
```

## 5. Persistencia (`ErrorLog`)

Modelo Prisma nuevo en `schema.prisma`:

```prisma
enum ErrorLevel { info warn error critical }

model ErrorLog {
  id          String     @id @default(uuid())
  errorId     String     @unique
  code        String
  level       ErrorLevel
  httpStatus  Int
  message     String     @db.Text
  path        String?
  method      String?
  userId      String?
  context     Json?
  stack       String?    @db.LongText
  createdAt   DateTime   @default(now())
  @@index([code]); @@index([level]); @@index([createdAt]); @@index([userId])
}
```

Migración pendiente:

```bash
pnpm --filter @core/api prisma:migrate -- --name add_error_log
```

El `ErrorLogService` recibe el `PrismaClient` vía el token
`ERROR_LOG_PRISMA_CLIENT`. Mientras el wiring no esté completo (no hay
`PrismaModule` aún en el repo), el servicio funciona en modo "log-only"
y solo escribe en stdout.

### Wiring real (cuando exista `PrismaModule`)

```ts
@Module({
  imports: [ExceptionsModule, PrismaModule],
  providers: [
    {
      provide: ERROR_LOG_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class AppModule {}
```

## 6. Tratamiento por nivel

| Nivel      | Cuándo                                     | Log    | Persiste | UI sugerida          |
|------------|--------------------------------------------|--------|----------|----------------------|
| `info`     | Eventos esperados ocasionales              | sí     | no       | toast informativo    |
| `warn`     | Errores de usuario (validación, auth)      | sí     | sí       | toast amarillo       |
| `error`    | Errores del sistema controlados            | sí     | sí       | modal con `errorId`  |
| `critical` | Excepciones no esperadas / 5xx no manejado | + stack| sí       | pantalla full error  |

## 7. Frontend

Fuera del scope de esta tarea. El cliente HTTP del frontend debe detectar el
shape `{ errorId, code, message, level }` y renderizar según `level`. Mapear
`code` a copy traducido cuando exista i18n; fallback al `message` del backend.

## 8. Decisiones tomadas

- **Logger**: el de Nest (`Logger`) por defecto. Migrar a Pino cuando se
  implemente la tarea "Logger estructurado global (Pino)".
- **Persistencia desde `warn`**: `info` no se guarda para no inflar la tabla.
- **TTL / purga**: pendiente — job que purgue `> 90` días salvo `critical`,
  se abrirá como tarea aparte.
- **Catálogo cerrado**: añadir un código nuevo requiere tocar el catálogo
  (visible en code review, evita inflación de códigos ad-hoc).

## 9. Migración del filter existente

Hay un `DomainErrorFilter` previo en `apps/api/src/shared/filters/` que mapea
`DomainError` → HTTP por su `code`. El nuevo `GlobalExceptionFilter` lo
reemplaza una vez los errores de dominio se refactoricen a `AppException`:

- [ ] Renombrar `DomainError` subclasses a `AppException` con el código
  equivalente del catálogo.
- [ ] Quitar `DomainErrorFilter` del `app.module`.
- [ ] Importar `ExceptionsModule` en `app.module`.

Este PR **no migra** los errores existentes — añade la infraestructura.
La migración se hace incremental.

## 10. Criterios de aceptación

- [x] Catálogo de errores tipado en `error-codes.ts`.
- [x] `AppException` con `errorId` único y tests unitarios.
- [x] `GlobalExceptionFilter` con normalización + log + persistencia.
- [x] `ErrorLogService` con interfaz Prisma desacoplada.
- [x] Modelo `ErrorLog` en `schema.prisma`.
- [x] `ExceptionsModule` global registrando el filter.
- [ ] Migración Prisma aplicada (pendiente: requiere DB local).
- [ ] Wiring del `PrismaClient` real en `ERROR_LOG_PRISMA_CLIENT` (pendiente:
  cuando exista `PrismaModule` compartido).
- [ ] Migración de los errores existentes de IAM a `AppException`.

## 11. Tests

- Unit: `AppException` y `normalizeUnknownError` (`app.exception.spec.ts`).
- Pendientes:
  - Filter contra un `ExecutionContext` mock (request/response).
  - Integration: usar `supertest` contra una app Nest mínima para validar el
    shape de respuesta end-to-end.
