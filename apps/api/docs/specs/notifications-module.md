# Spec — Módulo `notifications`

> Estado: **borrador / pendiente de implementar**
> Owner: backend
> Última edición: 2026-06-15

## 1. Objetivo

Disponer en `@core/api` de **un único módulo** que envíe notificaciones a los
usuarios registrados por varios canales y mantenga registro auditable del
intento de entrega.

Requisitos funcionales pedidos:

1. Canales soportados: **email**, **push (FCM)**, **SMS** e **in-app (WebSocket)**.
2. Las **notificaciones en tiempo real** llegan a los fronts (backoffice, web,
   mobile) por **WebSocket**.
3. **Push** se gestiona vía **Firebase Cloud Messaging**.
4. Toda notificación va dirigida a un `User` registrado en la BBDD.
5. **SMS y Push se persisten** con su estado real de entrega
   (`pending → sent → delivered/failed/…`). El email también, por coherencia.

Sigue el mismo patrón ya establecido por
[`mailer.module.ts`](../../../src/modules/mailer/mailer.module.ts) y por el
spec de [storage](./storage-module.md): **un port por canal**, varios
adapters en `infrastructure/adapters`, selección del adapter por env.

## 2. Modelo conceptual

```
                                  ┌─────────────────────────┐
                                  │  SendNotificationUseCase│
                                  └───────────┬─────────────┘
                                              │ 1. Persiste Notification + N x Delivery (status=pending)
                                              │ 2. Para cada Delivery: dispatcher.dispatch(delivery)
                                              ▼
                          ┌──────────────────────────────────────┐
                          │       NotificationDispatcher          │
                          │ (resuelve canal → puerto correcto)   │
                          └──┬─────────┬──────────┬──────────┬───┘
                             │         │          │          │
                          email      sms        push     in-app
                             │         │          │          │
                             ▼         ▼          ▼          ▼
                        MailerPort SmsPort  PushPort  RealtimePort
                             │         │          │          │
                             ▼         ▼          ▼          ▼
                       SMTP/SES   Twilio/…    FCM     WebSocket gateway
```

- **Notification** = el "evento de negocio" (1 registro en BBDD).
- **NotificationDelivery** = 1 intento de envío por (notification × canal × destino).
  Es lo que tiene `status`, `providerMessageId`, timestamps, error, etc.
- **DeviceToken** = tokens FCM registrados por dispositivo del usuario (para push).
- **UserNotificationPreference** = opt-in/opt-out por (user × tipo × canal).

Separar `Notification` de `NotificationDelivery` permite enviar el mismo
evento por varios canales (ej: "reset password" → email + in-app) y trackear
el estado de cada uno por separado, que es justo lo que pide el requisito 5.

## 3. Driver model

Igual que `storage` y `mailer`: el módulo expone *ports*, los adapters se
seleccionan por env.

| Canal | Env var | Valores |
|---|---|---|
| Email | `MAILER_DRIVER` (ya existe) | `smtp`, `ses`, `console` |
| SMS | `SMS_DRIVER` | `twilio`, `vonage`, `console` (default local) |
| Push | `PUSH_DRIVER` | `fcm`, `console` (default local) |
| In-app | — | siempre WebSocket gateway interno |

En `apps/api/.env.local`:

```
SMS_DRIVER=console
PUSH_DRIVER=console
```

En pre/pro la pipeline inyecta `SMS_DRIVER=twilio` + creds, `PUSH_DRIVER=fcm`
+ creds (service account JSON o variables individuales, ver §8).

> **Decisión:** arrancamos con **Twilio** (SMS) y **FCM** (push). Otros
> drivers quedan definidos en el spec pero su implementación se pospone hasta
> que haya necesidad real. La forma de los ports asume que añadirlos no
> tocará nada de `application/` ni `domain/`.

## 4. Persistencia (Prisma)

Añadir a [`prisma/schema.prisma`](../../prisma/schema.prisma):

```prisma
enum NotificationChannel {
  EMAIL
  SMS
  PUSH
  IN_APP
}

enum NotificationStatus {
  PENDING       // creada, aún no entregada al provider
  SENT          // entregada al provider (provider la aceptó)
  DELIVERED     // provider confirmó entrega al destinatario (FCM ack, Twilio delivered, SMTP DSN)
  READ          // solo IN_APP / PUSH abierto: el usuario la ha leído
  FAILED        // provider rechazó o el envío falló terminalmente
  BOUNCED       // email rebotado, número inválido, token expirado
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
}

model Notification {
  id          String   @id @default(uuid()) @db.Char(36)
  userId      String   @db.Char(36)
  type        String   @db.VarChar(80)        // "auth.password_reset", "order.shipped", etc. — clave estable
  title       String   @db.VarChar(160)
  body        String   @db.Text
  data        Json?                            // payload arbitrario para el front (deeplinks, ids…)
  priority    NotificationPriority @default(NORMAL)
  groupKey    String?  @db.VarChar(120)        // opcional: agrupar notifs (collapse_key FCM, threadId, etc.)
  createdAt   DateTime @default(now())
  readAt      DateTime?                        // marca cuando el user la lee desde el front

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries  NotificationDelivery[]

  @@index([userId, createdAt])
  @@index([type])
  @@map("notification")
}

model NotificationDelivery {
  id                  String   @id @default(uuid()) @db.Char(36)
  notificationId      String   @db.Char(36)
  channel             NotificationChannel
  status              NotificationStatus @default(PENDING)
  target              String   @db.VarChar(255)    // email, e164, deviceToken, socketRoom — depende del canal
  provider            String?  @db.VarChar(40)     // "ses", "twilio", "fcm"…
  providerMessageId   String?  @db.VarChar(160)    // id devuelto por el provider para webhook reconciliation
  attempts            Int      @default(0)
  lastError           String?  @db.Text
  scheduledAt         DateTime?                    // para envíos diferidos (futuro)
  sentAt              DateTime?
  deliveredAt         DateTime?
  failedAt            DateTime?
  updatedAt           DateTime @updatedAt

  notification        Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@index([status, channel])
  @@index([providerMessageId])  // lookup desde webhooks de Twilio/FCM
  @@map("notification_delivery")
}

model DeviceToken {
  id          String   @id @default(uuid()) @db.Char(36)
  userId      String   @db.Char(36)
  token       String   @db.VarChar(255)       // FCM registration token
  platform    String   @db.VarChar(20)        // "ios" | "android" | "web"
  deviceId    String?  @db.VarChar(120)       // identificador estable del dispositivo (opcional)
  appVersion  String?  @db.VarChar(40)
  isActive    Boolean  @default(true)         // se desactiva cuando FCM marca "unregistered"
  lastSeenAt  DateTime @default(now())
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@index([userId, isActive])
  @@map("device_token")
}

model UserNotificationPreference {
  id        String   @id @default(uuid()) @db.Char(36)
  userId    String   @db.Char(36)
  type      String   @db.VarChar(80)          // mismo "type" que Notification.type, o "*" para global
  channel   NotificationChannel
  enabled   Boolean  @default(true)

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type, channel])
  @@map("user_notification_preference")
}
```

Y en `User` añadir las relaciones inversas:
```prisma
notifications        Notification[]
deviceTokens         DeviceToken[]
notificationPrefs    UserNotificationPreference[]
```

Migración:
```bash
pnpm --filter @core/api prisma:migrate -- --name add_notifications
```

## 5. Estructura de carpetas

Siguiendo §2.2 de la skill `core-architecture`:

```
src/modules/notifications/
├── domain/
│   ├── entities/
│   │   ├── notification.entity.ts
│   │   ├── notification-delivery.entity.ts
│   │   └── device-token.entity.ts
│   ├── value-objects/
│   │   └── notification-channel.vo.ts        // enum espejo (no acoplar a Prisma)
│   └── errors/
│       ├── notification-not-found.error.ts
│       └── invalid-device-token.error.ts
│
├── application/
│   ├── ports/
│   │   ├── notification-repository.port.ts
│   │   ├── device-token-repository.port.ts
│   │   ├── sms.port.ts
│   │   ├── push.port.ts
│   │   ├── realtime.port.ts                  // emit a WebSocket
│   │   └── notification-dispatcher.port.ts   // orquesta los 4 ports anteriores
│   ├── use-cases/
│   │   ├── send-notification.use-case.ts
│   │   ├── list-user-notifications.use-case.ts
│   │   ├── mark-notification-as-read.use-case.ts
│   │   ├── register-device-token.use-case.ts
│   │   ├── unregister-device-token.use-case.ts
│   │   ├── update-preferences.use-case.ts
│   │   └── handle-provider-webhook.use-case.ts   // reconcilia status desde Twilio/FCM
│   └── dto/
│       └── send-notification.input.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-notification.repository.ts
│   │   └── prisma-device-token.repository.ts
│   ├── adapters/
│   │   ├── sms/
│   │   │   ├── twilio-sms.adapter.ts
│   │   │   └── console-sms.adapter.ts
│   │   ├── push/
│   │   │   ├── fcm-push.adapter.ts
│   │   │   └── console-push.adapter.ts
│   │   └── realtime/
│   │       └── socket-io-realtime.adapter.ts  // wraps el gateway
│   ├── http/
│   │   ├── dto/
│   │   │   ├── register-device-token.dto.ts
│   │   │   ├── send-notification.dto.ts        // solo admin/test, no es la API pública del módulo
│   │   │   ├── update-preferences.dto.ts
│   │   │   ├── twilio-webhook.dto.ts
│   │   │   └── fcm-webhook.dto.ts
│   │   ├── notifications.controller.ts
│   │   ├── device-tokens.controller.ts
│   │   ├── preferences.controller.ts
│   │   └── webhooks.controller.ts
│   ├── ws/
│   │   ├── notifications.gateway.ts            // @WebSocketGateway de Nest
│   │   └── ws-auth.guard.ts                    // valida JWT del handshake
│   └── mappers/
│       ├── notification.mapper.ts
│       └── device-token.mapper.ts
│
└── notifications.module.ts
```

## 6. Puertos

### 6.1 `SmsPort`

```ts
export interface SendSmsInput {
  to: string;             // E.164
  body: string;           // ≤ 160 chars idealmente; el adapter NO lo trunca
  /** Pasado por el use case; el adapter lo devuelve junto al providerMessageId. */
  deliveryId: string;
}

export interface SendSmsResult {
  providerMessageId: string;
  provider: string;       // "twilio"
  acceptedAt: Date;
}

export interface SmsPort {
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
```

### 6.2 `PushPort`

```ts
export interface SendPushInput {
  tokens: string[];                              // 1..N tokens FCM (multidispositivo)
  title: string;
  body: string;
  data?: Record<string, string>;                 // FCM exige string→string
  collapseKey?: string;
  priority?: 'normal' | 'high';
  deliveryId: string;
}

export interface SendPushResult {
  successCount: number;
  failureCount: number;
  /** tokens que el provider marcó como inválidos → desactivar en BBDD */
  invalidTokens: string[];
  providerMessageIds: string[];                  // FCM devuelve uno por token
  provider: string;                              // "fcm"
}

export interface PushPort {
  send(input: SendPushInput): Promise<SendPushResult>;
}
```

### 6.3 `RealtimePort`

```ts
export interface EmitToUserInput {
  userId: string;
  event: string;                                 // ej: "notification:new", "notification:read"
  payload: unknown;
}

export interface RealtimePort {
  emitToUser(input: EmitToUserInput): Promise<void>;
  /** Para broadcasts opcionales por rooms (futuro). */
  emitToRoom(room: string, event: string, payload: unknown): Promise<void>;
}
```

### 6.4 `NotificationDispatcherPort`

Lo usan los demás módulos del backend para "lanzar una notificación". Es la
API pública del módulo.

```ts
export interface DispatchNotificationInput {
  userId: string;
  type: string;                                  // clave estable, ver §9
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];               // qué canales intentar
  priority?: NotificationPriority;
  groupKey?: string;
}

export interface NotificationDispatcherPort {
  dispatch(input: DispatchNotificationInput): Promise<Notification>;
}
```

El dispatcher es lo único que otros módulos del API inyectan (ej:
`iam/.../reset-password.use-case.ts` puede pedirle "manda un email + push de
'password reset'"). Los `SmsPort`/`PushPort` quedan internos al módulo.

## 7. WebSocket — gateway en tiempo real

- Implementación: **`@nestjs/websockets` + Socket.IO** (transporte sobre WS,
  con fallback long-polling, salas por usuario built-in).
- Path: `/ws/notifications` (versionado por si más adelante hay otros gateways).
- Autenticación: el cliente envía el **JWT** en `auth.token` del handshake.
  `WsAuthGuard` lo valida (reusa el `JwtService` de `iam`).
- Al conectar, el socket entra al room `user:{userId}`.
- Eventos server → client:
  - `notification:new` — payload = la `Notification` recién creada
  - `notification:read` — { id } — cuando otra sesión la marca leída
  - `notification:status` — { id, channel, status } — actualización viniendo de webhooks
- Eventos client → server:
  - `notification:ack` — { id } — marca como leída (equivalente al endpoint REST)

**Importante:** el WebSocket es **canal IN_APP** Y vehículo de notificación
para los otros canales. Es decir: cuando llega un push o un SMS, también se
emite `notification:status` por WS para que el front actualice contadores.

**Escalado:** si en el futuro la API corre en > 1 instancia, hay que añadir
`@socket.io/redis-adapter` para que `emitToUser` llegue al socket aunque esté
conectado a otra réplica. Se documenta pero **no se implementa en MVP** —
arrancamos single-instance.

## 8. Variables de entorno

Añadir a `apps/api/.env.example` (y a `.env`/`.env.local` según corresponda):

```bash
# --- SMS ---
SMS_DRIVER=console                # twilio | console
TWILIO_ACCOUNT_SID=               # solo si SMS_DRIVER=twilio (secreto → .env)
TWILIO_AUTH_TOKEN=                # secreto → .env
TWILIO_FROM_NUMBER=               # E.164, no secreto → .env.local

# --- Push (FCM) ---
PUSH_DRIVER=console               # fcm | console
FCM_PROJECT_ID=                   # no secreto → .env.local
FCM_CLIENT_EMAIL=                 # del service account → .env
FCM_PRIVATE_KEY=                  # secreto, multilínea → .env (con \n literales)

# --- WebSocket ---
WS_CORS_ORIGINS=http://localhost:5173,http://localhost:4321   # .env.local
WS_PATH=/ws/notifications         # .env.local
```

Validar todas estas en `shared/config/` con el mismo Joi/Zod schema que ya
exista. Si el driver es `console`, las creds del provider correspondiente son
opcionales.

## 9. Convención de `type`

`type` es una clave estable, sin acentos, en `lower.snake.dotted`:

```
auth.email_verified
auth.password_reset_requested
order.shipped
order.cancelled
billing.invoice_paid
billing.invoice_failed
```

Sirve para:
- agrupar preferencias por usuario (`UserNotificationPreference.type`),
- routing del payload en el front (deeplinks),
- filtrar en el endpoint de listar.

Las plantillas de email viven en `modules/mailer/infrastructure/templates/`
y se nombran igual: `auth.password_reset_requested.hbs`. Cuando una
notificación incluye el canal EMAIL, el adapter de email busca la template
por `type`.

## 10. Endpoints HTTP

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/notifications` | Lista del usuario autenticado, paginada, filtrable por `type`, `unreadOnly`. |
| `GET` | `/notifications/unread-count` | Contador rápido. |
| `POST` | `/notifications/:id/read` | Marca una como leída. |
| `POST` | `/notifications/read-all` | Marca todas como leídas. |
| `POST` | `/device-tokens` | Registra un token FCM del dispositivo actual. |
| `DELETE` | `/device-tokens/:token` | Desregistra (logout, "no recibir más push"). |
| `GET` | `/notification-preferences` | Lista preferencias del usuario. |
| `PUT` | `/notification-preferences` | Actualiza preferencias (bulk). |
| `POST` | `/webhooks/notifications/twilio` | Webhook de Twilio (status callback). **Sin JWT**, valida firma `X-Twilio-Signature`. |
| `POST` | `/webhooks/notifications/fcm` | Reservado — FCM no tiene webhook clásico; en realidad la info de fallo viene en la respuesta del send. Se deja documentado por simetría. |

Todos los endpoints (excepto webhooks) requieren JWT y filtran por
`req.user.id`. Decorar con `@ApiTags('notifications')`, `@ApiOperation`,
`@ApiBearerAuth`.

## 11. Flujo end-to-end (ejemplo)

Caso: "el pedido del usuario se ha enviado" → push + in-app, email opcional según preferencias.

1. `orders/.../ship-order.use-case.ts` llama
   `notificationDispatcher.dispatch({ userId, type: 'order.shipped', title, body, data: { orderId }, channels: [PUSH, IN_APP, EMAIL] })`.
2. `SendNotificationUseCase`:
   1. Filtra `channels` por preferencias del usuario (un canal deshabilitado por el user → no se crea Delivery para ese canal).
   2. Crea `Notification` + N `NotificationDelivery` con `status=PENDING` en una transacción.
   3. Para cada delivery (en paralelo, sin bloquear la respuesta HTTP del use case que llamó):
      - IN_APP → `RealtimePort.emitToUser('notification:new', notification)` → `status=DELIVERED`, `deliveredAt=now`.
      - PUSH → resuelve `DeviceToken.findActiveByUser(userId)`; si no hay tokens → `status=FAILED, lastError='no active tokens'`. Si hay → `PushPort.send(...)` → guarda `providerMessageIds`, marca tokens inválidos como `isActive=false`, status `SENT`.
      - EMAIL → `MailerPort.send(...)` con la template `order.shipped.hbs` → status `SENT`.
4. Si el envío al provider tarda, la creación devuelve YA — el use case que disparó no espera (fire-and-forget interno, usando `Promise.allSettled` envuelto en un await dentro del propio use case del módulo de notificaciones). Para errores que requieran reintento → tabla `notification_delivery.attempts` + un job (futuro, ver §13).
5. Twilio reporta `delivered` por webhook → `HandleProviderWebhookUseCase` busca por `providerMessageId`, pasa `status=DELIVERED, deliveredAt=now`, y emite `notification:status` por WS para que el front actualice.

## 12. Errores y reintentos

- **Errores de validación de input** → 400 desde el controller.
- **Fallo del provider (5xx/timeout)** → el adapter lanza, el use case captura,
  marca el delivery `status=FAILED, lastError=<msg>, attempts+=1`. **No** se
  rompe el resto de canales.
- **Tokens FCM inválidos** (`registration-token-not-registered`, `invalid-registration-token`):
  marcar `DeviceToken.isActive=false` en el mismo flujo, no esperar al
  siguiente envío.
- **Reintento automático**: fuera de scope del MVP. Se documenta como
  iteración 2 con BullMQ + Redis (ver §13).

## 13. Fuera de scope (MVP)

Cosas que el spec deja preparadas pero NO se implementan en la primera vuelta:

- **Cola de reintentos** (BullMQ + Redis): los envíos fallidos quedan en
  `status=FAILED` y ya está. Cuando haya volumen real se añade un worker que
  relee `NotificationDelivery WHERE status=FAILED AND attempts<3`.
- **Envíos programados** (`scheduledAt`): la columna ya existe en el schema,
  pero no hay scheduler en el MVP.
- **Plantillas para SMS/Push** (i18n, variables): por ahora `title`+`body`
  vienen ya renderizados desde el caller. Cuando haya >5 tipos de
  notificación, mover a sistema de templates igual que el mailer.
- **Redis adapter para Socket.IO**: necesario solo si la API corre con > 1
  réplica. Documentado en §7.
- **Apple Push (APNs nativo)**: FCM ya enruta a APNs, no hace falta canal
  separado salvo que aparezca un requisito específico.

## 14. Quick checks antes de implementar

- [ ] El módulo respeta la frontera `domain` ⟂ Nest/Prisma (§2.3 de la skill `core-architecture`).
- [ ] El `NotificationDispatcherPort` es la **única** superficie que los otros módulos del API ven (no exportar `SmsPort`/`PushPort` desde el `notifications.module.ts`).
- [ ] Cada controller tiene `@ApiTags` + `@ApiOperation` para que aparezca en `/docs`.
- [ ] `FCM_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN` → en `.env` (secretos), nunca en `.env.local`.
- [ ] El webhook de Twilio valida `X-Twilio-Signature` antes de tocar la BBDD.
- [ ] Migración corrida y `prisma generate` produce el cliente sin errores.
- [ ] La gateway WebSocket valida JWT en el handshake — un socket sin auth se desconecta inmediatamente.
