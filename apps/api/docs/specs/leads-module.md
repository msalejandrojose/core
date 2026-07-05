# Spec — Módulo `leads`

> Estado: **implementado (MVP)** — módulo `apps/api/src/modules/leads/`
> Owner: backend
> Última edición: 2026-07-05

## 1. Objetivo

Disponer en `@core/api` de **un módulo** que capture, almacene y gestione el
ciclo de vida de **leads** (contactos comerciales potenciales) desde su origen
hasta su conversión o descarte.

Requisitos funcionales:

1. **Captura multi-origen**: formulario público (integración con
   `dynamic-forms`), alta manual desde backoffice, importación y API directa.
2. **Deduplicación** por email/teléfono en el momento de la captura (un mismo
   contacto no debe crear N leads).
3. **Pipeline de estados** configurable (lifecycle: `NEW → CONTACTED →
   QUALIFIED → … → WON | LOST`).
4. **Asignación** de cada lead a un `User` responsable (owner).
5. **Timeline auditable**: cada cambio relevante (estado, asignación, nota,
   contacto) queda registrado como actividad.
6. **Scoring** numérico y **tags** para segmentar.
7. **Atribución**: origen + campos UTM + enlace suave a la `FormResponse` que
   lo generó.
8. **Consentimiento** (GDPR): marca de opt-in y fecha.
9. **Conversión**: un lead ganado puede vincularse al `User`/cliente que se creó.
10. **Automatización**: cada transición emite un `WorkflowEvent` para que el
    módulo `workflows` dispare acciones (email de bienvenida vía
    `notifications`, asignación automática, etc.).

El módulo **no** implementa envío de emails ni reglas de negocio de
automatización: delega en `workflows` (motor) y `notifications` (canales). Su
responsabilidad es el **dato del lead y su ciclo de vida**.

## 2. Modelo conceptual

```
   Origen                          leads (este módulo)                 downstream
 ─────────────                ──────────────────────────────         ─────────────

 Web form  ──┐                ┌──────────────────────────┐
 (dynamic-  │  CaptureLead    │  Lead                     │  emit    ┌───────────┐
  forms)    ├───────────────▶ │  (dedupe + persist)       ├────────▶ │ workflows │
 API        │                 │                           │  Event   │  (motor)  │
 Manual     ┘                 │  LeadActivity[] (timeline)│          └─────┬─────┘
                              └──────────────┬────────────┘                │ dispatch
                                             │ transición                  ▼
                                             │ (status/assign/convert) ┌──────────────┐
                                             └────────────────────────▶│ notifications│
                                                     re-emite Event     │  (email/…)   │
                                                                        └──────────────┘
```

- **Lead** = el contacto y su estado actual (1 registro).
- **LeadActivity** = 1 entrada de timeline por cada hecho (nota, cambio de
  estado, asignación, contacto). Es el histórico auditable.
- La **captura** deduplica: si ya existe un lead abierto con el mismo email
  normalizado, en vez de crear uno nuevo añade una `LeadActivity` de
  "re-engagement" al existente (configurable, ver §7).
- Cada transición **emite un evento** al motor de `workflows` vía el
  `RegisterEventUseCase` que ese módulo ya exporta (§9). El módulo `leads` no
  conoce qué automatizaciones existen: solo publica hechos.

## 3. Persistencia (Prisma)

Añadir a [`prisma/schema.prisma`](../../prisma/schema.prisma). Se respetan las
convenciones del repo: `id` UUID `Char(36)`, `@@map` a snake_case, FK **suave**
a `User` (sin relación dura cuando el vínculo es opcional/auditoría), índices
para los accesos frecuentes.

```prisma
enum LeadStatus {
  NEW          // recién capturado, sin tocar
  CONTACTED    // primer contacto hecho
  QUALIFIED    // cumple criterio de calificación
  PROPOSAL     // se le ha enviado propuesta/oferta
  WON          // convertido (cierre positivo)
  LOST         // cierre negativo
  UNQUALIFIED  // descartado por no encajar (no es lo mismo que LOST)
}

enum LeadSource {
  WEB_FORM     // vino de una FormInstance pública
  MANUAL       // alta desde backoffice
  IMPORT       // carga masiva (CSV/etc.)
  API          // integración externa vía API key
  REFERRAL     // recomendación
  OTHER
}

enum LeadActivityType {
  NOTE             // nota libre de un usuario
  STATUS_CHANGE    // transición de LeadStatus
  ASSIGNMENT       // cambio de owner
  SCORE_CHANGE     // ajuste de score
  FORM_SUBMISSION  // re-envío del mismo contacto por formulario
  EMAIL            // contacto por email (registro manual o vía notifications)
  CALL             // llamada
  MEETING          // reunión
  CONVERSION       // paso a WON + vínculo a User
  SYSTEM           // acción automática de un workflow
}

model Lead {
  id            String     @id @default(uuid()) @db.Char(36)

  // --- Identidad del contacto ---
  email         String?    @db.VarChar(255)
  emailNormalized String?  @map("email_normalized") @db.VarChar(255) // lower+trim para dedupe
  phone         String?    @db.VarChar(40)
  firstName     String?    @map("first_name") @db.VarChar(100)
  lastName      String?    @map("last_name") @db.VarChar(100)
  company       String?    @db.VarChar(160)

  // --- Ciclo de vida ---
  status        LeadStatus @default(NEW)
  score         Int        @default(0)
  ownerId       String?    @map("owner_id") @db.Char(36) // FK suave a User (responsable)

  // --- Atribución / origen ---
  source        LeadSource @default(OTHER)
  formResponseId String?   @map("form_response_id") @db.Char(36) // FK suave a FormResponse
  utmSource     String?    @map("utm_source") @db.VarChar(120)
  utmMedium     String?    @map("utm_medium") @db.VarChar(120)
  utmCampaign   String?    @map("utm_campaign") @db.VarChar(120)

  // --- Datos flexibles ---
  customFields  Json?      @map("custom_fields") // campos arbitrarios del formulario/importación

  // --- Consentimiento (GDPR) ---
  consentGiven  Boolean    @default(false) @map("consent_given")
  consentAt     DateTime?  @map("consent_at")

  // --- Conversión ---
  convertedToUserId String? @map("converted_to_user_id") @db.Char(36) // FK suave a User creado
  convertedAt   DateTime?  @map("converted_at")

  createdById   String?    @map("created_by_id") @db.Char(36) // quién lo dio de alta (null si público)
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  activities    LeadActivity[]
  tags          LeadTagOnLead[]

  @@index([status, createdAt])       // listado principal del backoffice
  @@index([ownerId, status])         // "mis leads"
  @@index([emailNormalized])         // dedupe en captura
  @@index([source])
  @@map("lead")
}

/// Entrada de timeline. Inmutable: nunca se edita, solo se añade.
model LeadActivity {
  id          String           @id @default(uuid()) @db.Char(36)
  leadId      String           @map("lead_id") @db.Char(36)
  type        LeadActivityType
  /// Texto legible ("Cambió de NEW a CONTACTED", nota libre, etc.).
  body        String?          @db.Text
  /// Payload estructurado según `type` (from/to en STATUS_CHANGE, ownerId en
  /// ASSIGNMENT, delta en SCORE_CHANGE…). Se documenta la forma en §8.
  meta        Json?
  actorId     String?          @map("actor_id") @db.Char(36) // User que la generó (null = sistema)
  createdAt   DateTime         @default(now()) @map("created_at")

  lead        Lead             @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([leadId, createdAt])
  @@map("lead_activity")
}

/// Catálogo de tags. Mismo patrón que PostTag/PostTagOnPost ya existente.
model LeadTag {
  id        String          @id @default(uuid()) @db.Char(36)
  name      String          @unique @db.VarChar(80)
  color     String?         @db.VarChar(20)
  createdAt DateTime        @default(now()) @map("created_at")

  leads     LeadTagOnLead[]

  @@map("lead_tag")
}

model LeadTagOnLead {
  leadId String @map("lead_id") @db.Char(36)
  tagId  String @map("tag_id") @db.Char(36)

  lead Lead    @relation(fields: [leadId], references: [id], onDelete: Cascade)
  tag  LeadTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([leadId, tagId])
  @@map("lead_tag_on_lead")
}
```

> **Decisión — status como enum, no como tabla de pipeline configurable.**
> El MVP usa un `LeadStatus` enum fijo. Un pipeline configurable por el usuario
> (varios embudos, etapas custom con orden y color) queda documentado como
> iteración 2 (§14): implicaría tablas `Pipeline` + `PipelineStage` y cambiar
> `status` por `stageId`. Se arranca con enum porque cubre el 90% del caso y no
> introduce una pantalla de administración adicional.

> **FK suaves.** `ownerId`, `formResponseId`, `convertedToUserId`, `createdById`
> y `actorId` son FK **suaves** (columna `Char(36)` sin `@relation` dura),
> coherente con `Form.createdById`. Evita cascadas indeseadas (borrar un `User`
> no debe borrar el histórico de leads) y desacopla el módulo.

Migración:
```bash
pnpm --filter @core/api prisma:migrate -- --name add_leads
```

## 4. Estructura de carpetas

Siguiendo §2.2 de la skill `core-architecture`:

```
src/modules/leads/
├── domain/
│   ├── entities/
│   │   ├── lead.entity.ts
│   │   └── lead-activity.entity.ts
│   ├── value-objects/
│   │   └── lead-status.vo.ts          // enum espejo + transiciones válidas
│   └── errors/
│       ├── lead-not-found.error.ts
│       └── invalid-status-transition.error.ts
│
├── application/
│   ├── ports/
│   │   ├── lead-repository.port.ts
│   │   ├── lead-activity-repository.port.ts
│   │   └── lead-event-publisher.port.ts   // fina abstracción sobre workflows (§9)
│   ├── use-cases/
│   │   ├── capture-lead.use-case.ts        // captura + dedupe (público/API)
│   │   ├── create-lead.use-case.ts         // alta manual (backoffice)
│   │   ├── list-leads.use-case.ts
│   │   ├── get-lead.use-case.ts
│   │   ├── update-lead.use-case.ts         // datos de contacto / customFields
│   │   ├── change-lead-status.use-case.ts  // transición validada + evento
│   │   ├── assign-lead.use-case.ts
│   │   ├── add-lead-note.use-case.ts
│   │   ├── convert-lead.use-case.ts        // → WON + vínculo a User
│   │   ├── set-lead-tags.use-case.ts
│   │   └── list-lead-activities.use-case.ts
│   └── dto/
│       ├── capture-lead.input.ts
│       └── change-status.input.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-lead.repository.ts
│   │   └── prisma-lead-activity.repository.ts
│   ├── events/
│   │   └── workflow-lead-event-publisher.ts // implementa LeadEventPublisherPort con RegisterEventUseCase
│   ├── http/
│   │   ├── dto/
│   │   │   ├── capture-lead.dto.ts          // request público
│   │   │   ├── create-lead.dto.ts
│   │   │   ├── update-lead.dto.ts
│   │   │   ├── change-status.dto.ts
│   │   │   ├── assign-lead.dto.ts
│   │   │   ├── add-note.dto.ts
│   │   │   ├── convert-lead.dto.ts
│   │   │   ├── set-tags.dto.ts
│   │   │   ├── list-leads.query.dto.ts      // extiende CursorPaginationQueryDto
│   │   │   ├── lead.response.dto.ts
│   │   │   └── lead-activity.response.dto.ts
│   │   ├── leads.controller.ts              // backoffice (JWT)
│   │   └── public-leads.controller.ts       // captura pública (sin JWT)
│   └── mappers/
│       ├── lead.mapper.ts
│       └── lead-activity.mapper.ts
│
└── leads.module.ts
```

## 5. Puertos

### 5.1 `LeadRepositoryPort`

```ts
export interface LeadRepositoryPort {
  create(input: CreateLeadData): Promise<Lead>;
  update(id: string, patch: Partial<UpdateLeadData>): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  /** Dedupe: lead ABIERTO (status ∉ {WON, LOST, UNQUALIFIED}) con ese email. */
  findOpenByEmail(emailNormalized: string): Promise<Lead | null>;
  /** Listado por cursor (createdAt DESC, id ASC). Ver §11. */
  listWithCursor(params: ListLeadsParams): Promise<CursorPage<Lead>>;
  setTags(leadId: string, tagIds: string[]): Promise<void>;
}
```

`ListLeadsParams` incluye `limit`, `cursor` y los filtros del recurso
(`status`, `ownerId`, `source`, `tagId`, `q` para búsqueda por nombre/email).

### 5.2 `LeadActivityRepositoryPort`

```ts
export interface LeadActivityRepositoryPort {
  append(input: CreateActivityData): Promise<LeadActivity>;
  listByLeadWithCursor(leadId: string, params: CursorParams): Promise<CursorPage<LeadActivity>>;
}
```

Las actividades son **append-only**: no hay `update` ni `delete`.

### 5.3 `LeadEventPublisherPort`

La superficie que aísla `leads` del motor de `workflows`. El módulo publica
**hechos**, no acciones.

```ts
export interface LeadEventPublisherPort {
  publish(event: LeadDomainEvent): Promise<void>;
}

export type LeadDomainEvent =
  | { type: 'lead.created';        leadId: string; payload: Record<string, unknown> }
  | { type: 'lead.status_changed'; leadId: string; payload: { from: LeadStatus; to: LeadStatus } }
  | { type: 'lead.assigned';       leadId: string; payload: { ownerId: string } }
  | { type: 'lead.converted';      leadId: string; payload: { userId: string } };
```

La implementación (`workflow-lead-event-publisher.ts`) traduce cada
`LeadDomainEvent` a la entrada de `RegisterEventUseCase` (que `workflows`
exporta) con `correlationId = leadId` para poder trazar toda la cadena. Si el
día de mañana se cambia el bus de eventos, solo se toca este adapter.

## 6. Integración con `dynamic-forms`

Un formulario público puede alimentar leads sin acoplar los módulos:

1. La web/backoffice crea un `Form` con los campos del lead y una `FormInstance`
   pública (patrón ya existente en `dynamic-forms`).
2. Cuando llega una respuesta, hay **dos opciones** (elegir en implementación):
   - **A — el front llama a `/public/leads`** pasando el `formInstanceHash` y el
     `formResponseId` devuelto por el submit. Simple, sin acoplar backends.
     Es la opción **por defecto del MVP**.
   - **B — un workflow** escucha el evento `form.response.submitted` (si
     `dynamic-forms` lo emite) y llama internamente a `CaptureLeadUseCase`. Más
     desacoplado pero requiere que forms emita el evento. Documentado para
     iteración 2.
3. `CaptureLeadUseCase` mapea `answers → {email, phone, name, customFields}`,
   guarda `source=WEB_FORM` y `formResponseId`, y deduplica.

> El módulo `leads` **no importa** `dynamic-forms`. La única referencia es el
> `formResponseId` como FK suave, para poder auditar de qué envío salió el lead.

## 7. Deduplicación

En `CaptureLeadUseCase`:

1. Normaliza el email (`trim().toLowerCase()`) → `emailNormalized`.
2. `repo.findOpenByEmail(emailNormalized)`:
   - **Existe un lead abierto** → **no crea otro**. Añade una `LeadActivity`
     `type=FORM_SUBMISSION` con el nuevo payload y (opcional) actualiza
     `customFields`/`score`. Emite `lead.re_engaged` (no `lead.created`).
   - **No existe** (o el previo está cerrado: WON/LOST/UNQUALIFIED) → crea un
     lead nuevo con `status=NEW`.
3. Sin email pero con teléfono → misma lógica por `phone`.
4. Sin email ni teléfono → se crea igualmente (no se puede deduplicar), con un
   flag/nota para revisión manual.

> **Ventana de dedupe.** Por defecto se deduplica contra leads **abiertos**
> (cualquier antigüedad). Si se quiere reabrir contactos cerrados hace mucho,
> se parametriza con una ventana temporal en iteración 2.

## 8. Timeline — forma del `meta` por tipo

`LeadActivity.meta` es un JSON cuya forma depende de `type`:

| `type` | `meta` | `body` sugerido |
|---|---|---|
| `NOTE` | `null` | texto libre del usuario |
| `STATUS_CHANGE` | `{ from, to }` | "NEW → CONTACTED" |
| `ASSIGNMENT` | `{ from: ownerId\|null, to: ownerId }` | "Asignado a Ana" |
| `SCORE_CHANGE` | `{ from, to, delta }` | "+10 (abrió email)" |
| `FORM_SUBMISSION` | `{ formResponseId, formInstanceHash }` | "Reenvío de formulario" |
| `EMAIL`/`CALL`/`MEETING` | `{ direction?, at? }` | resumen del contacto |
| `CONVERSION` | `{ userId }` | "Convertido en cliente" |
| `SYSTEM` | `{ workflowRunId?, step? }` | acción del workflow |

El `body` se genera en el use-case (server-side, en español), no en el front,
para que el timeline sea consistente venga de donde venga.

## 9. Eventos emitidos a `workflows`

Cada transición publica un `WorkflowEvent` (vía `RegisterEventUseCase`
exportado por `workflows`). `type` sigue la convención `lower.dotted` ya usada
en el repo (`user.signed_up`):

| Evento | Cuándo | `payload` |
|---|---|---|
| `lead.created` | Alta de un lead nuevo | datos del lead (email, source, ownerId…) |
| `lead.re_engaged` | Dedupe: reenvío de un lead abierto | `{ leadId, formResponseId }` |
| `lead.status_changed` | Transición de estado | `{ from, to }` |
| `lead.assigned` | Cambio de owner | `{ ownerId, previousOwnerId }` |
| `lead.converted` | Paso a WON con vínculo a User | `{ userId }` |
| `lead.lost` | Paso a LOST/UNQUALIFIED | `{ reason? }` |

`sourceUserId` = el actor (o null si público), `correlationId` = `leadId`,
`idempotencyKey` = `${leadId}:${type}:${timestamp}` para no re-disparar en
reintentos.

Esto permite, sin tocar `leads`, montar workflows como:
- `lead.created` → enviar email de bienvenida (`notifications`) + asignar al
  comercial de guardia (round-robin).
- `lead.status_changed` a `QUALIFIED` → notificar al owner.
- `lead.converted` → crear la cuenta / evento de billing.

## 10. Máquina de estados

Transiciones válidas (se valida en `ChangeLeadStatusUseCase`; una transición
inválida lanza `InvalidStatusTransitionError` → `422`):

```
NEW        → CONTACTED, UNQUALIFIED, LOST
CONTACTED  → QUALIFIED, UNQUALIFIED, LOST
QUALIFIED  → PROPOSAL, LOST, UNQUALIFIED
PROPOSAL   → WON, LOST
WON        → (terminal)
LOST       → NEW            // reapertura permitida
UNQUALIFIED→ NEW            // reapertura permitida
```

- Cada cambio: persiste el nuevo `status`, añade `LeadActivity STATUS_CHANGE`
  y emite `lead.status_changed` en **una transacción** (la emisión del evento
  puede ir fire-and-forget tras el commit; ver §13).
- `WON` solo se alcanza vía `ConvertLeadUseCase` (exige el vínculo a User),
  no por `change-status` a pelo.

## 11. Endpoints HTTP

### Público (sin JWT)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/public/leads` | Captura desde web/API. Body: contacto + `formInstanceHash?` + `formResponseId?` + UTM + `consentGiven`. Rate-limit + honeypot recomendados. |

Devuelve `201` con un cuerpo mínimo (`{ id, status }`) — **no** expone datos
internos del lead a un origen público.

### Backoffice (JWT + permiso de sección)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/leads` | Listado por cursor. Filtros: `status`, `ownerId`, `source`, `tagId`, `q`. |
| `POST` | `/leads` | Alta manual. |
| `GET` | `/leads/:id` | Detalle (sin envelope). |
| `PATCH` | `/leads/:id` | Actualiza contacto / `customFields` / consentimiento. |
| `POST` | `/leads/:id/status` | Cambia estado (transición validada). |
| `POST` | `/leads/:id/assign` | Asigna owner. |
| `POST` | `/leads/:id/notes` | Añade nota al timeline. |
| `POST` | `/leads/:id/convert` | Convierte (→ WON + `convertedToUserId`). |
| `PUT` | `/leads/:id/tags` | Setea tags (bulk). |
| `GET` | `/leads/:id/activities` | Timeline por cursor. |

Todos (excepto el público) requieren JWT. Decorar con `@ApiTags('leads')`,
`@ApiOperation`, `@ApiBearerAuth`. Los listados usan
`@ApiCursorPaginatedResponse(...)` y el `meta` lo construye el controller
(§9 de la skill `core-architecture`).

## 12. Registro en el backoffice — nodo del sidebar

Los endpoints de §11 existen a nivel de API, pero **no aparecen en el
backoffice** hasta que se registra el nodo de navegación correspondiente en el
árbol de `Section` (scope `BACKOFFICE`). El sidebar dinámico (BO-07) consume
`GET /sections/tree?scope=BACKOFFICE` y filtra por los permisos del usuario, así
que basta con seedear la sección y darle acceso a los roles que gestionan leads.

**Seed a añadir** (en el seed de secciones del backend, junto a los de `users`,
`blog`, etc.):

```ts
// scope BACKOFFICE. Un único nodo de primer nivel es suficiente para el MVP.
{
  code: 'leads',
  name: 'Leads',                 // label directo (i18n llegará después, ver BO-07)
  icon: 'Contact',               // nombre de icono lucide-react (añadir al ICON_MAP del front)
  route: '/leads',
  scope: 'BACKOFFICE',
  order: 40,                     // colócalo según el orden deseado del menú
  isActive: true,
  apiRequirements: null,         // opcional: exigir permisos IAM de api-section
}
```

- **Acceso por rol:** crear un `RoleSectionAccess` con `access = GRANT` para los
  roles que gestionan leads (p.ej. `admin`, `comercial`/`sales`). Sin registro,
  la sección queda oculta (deny-by-default). Un `UserSectionAccess DENY` puntual
  permite excepciones por usuario.
- **Sub-navegación (opcional):** si se implementa la vista Kanban del backoffice
  como ruta separada, añadir un nodo hijo `leads.board` (`route: '/leads/board'`,
  `parentId` = el nodo `leads`). Para el MVP con una sola pantalla de listado no
  hace falta.
- **Icono:** `Contact` (o `UserPlus`) debe añadirse al `ICON_MAP` de
  `apps/backoffice/src/lib/icons.ts`; si no está, el sidebar usa el fallback.

> El detalle de las **pantallas** (listado, ficha con timeline, Kanban) vive en
> el spec de frontend
> [`apps/backoffice/docs/specs/10-modulo-leads.md`](../../../backoffice/docs/specs/10-modulo-leads.md).
> Este módulo de API solo aporta los endpoints y el seed de la sección.

## 13. Transaccionalidad y errores

- **Transición + activity** van en la misma transacción Prisma. La **emisión
  del evento** a `workflows` se hace **después del commit** (fire-and-forget con
  `Promise` capturado): un fallo del motor de eventos **no** debe revertir el
  cambio de estado del lead. Si falla la publicación, se loguea (no se pierde el
  cambio de dato, sí puede perderse una automatización → aceptable en MVP,
  outbox en iteración 2).
- Errores de dominio → `DomainErrorFilter` (ya existente):
  - `LeadNotFoundError` → `404`.
  - `InvalidStatusTransitionError` → `422`.
  - Captura pública malformada → `400`.
- **Idempotencia de captura pública**: si llega el mismo `formResponseId` dos
  veces (reintento del front), no crear dos leads → buscar por `formResponseId`
  antes de crear.

## 14. Fuera de scope (MVP)

- **Pipeline configurable** (tablas `Pipeline`/`PipelineStage`, varios embudos,
  etapas custom): iteración 2. El MVP usa el enum `LeadStatus`.
- **Scoring automático por reglas** (lead scoring): el `score` existe y se
  ajusta a mano o desde workflows; un motor de reglas propio queda fuera.
- **Importación CSV**: el `source=IMPORT` y `customFields` están preparados,
  pero el endpoint de importación masiva se especifica aparte.
- **Outbox pattern** para garantizar la entrega de eventos: en MVP es
  fire-and-forget post-commit. Se documenta como mejora.
- **Merge manual de duplicados**: la dedupe automática cubre captura; unir dos
  leads existentes a mano es iteración 2.
- **Reasignación round-robin / SLA**: se resuelve con workflows sobre
  `lead.created`, no con código en este módulo.

## 15. Quick checks antes de implementar

- [ ] El módulo respeta la frontera `domain` ⟂ Nest/Prisma (§2.3 de `core-architecture`).
- [ ] `leads` **no importa** `dynamic-forms` ni `notifications`; solo depende de
      `workflows` a través de `LeadEventPublisherPort` (adapter fino).
- [ ] La captura pública deduplica por `emailNormalized`/`phone` y por
      `formResponseId` (idempotencia).
- [ ] Cada controller tiene `@ApiTags`/`@ApiOperation` para `/docs`; el público
      documenta que va sin `@ApiBearerAuth`.
- [ ] Seed de la `Section` `leads` (scope `BACKOFFICE`) + `RoleSectionAccess`
      `GRANT` para los roles que gestionan leads (§12).
- [ ] Los listados usan paginación por cursor (`createdAt DESC, id ASC`) y el
      `meta` lo arma el controller.
- [ ] Las transiciones de estado se validan contra la máquina de §10.
- [ ] La emisión de eventos es post-commit y su fallo no revierte el cambio.
- [ ] Migración corrida y `prisma generate` produce el cliente sin errores.
- [ ] FK suaves (`ownerId`, `formResponseId`, `convertedToUserId`, `actorId`)
      no rompen el histórico al borrar un `User`.
