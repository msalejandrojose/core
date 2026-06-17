# Spec — Módulo `workflows`

> Estado: **borrador / pendiente de implementar**
> Owner: backend
> Última edición: 2026-06-15

## 1. Objetivo

Disponer en `@core/api` de un **motor de workflows reactivos** que permita:

1. **Registrar eventos** en el sistema (`user.signed_up`, `order.paid`,
   `device.connected`…) como ciudadanos de primera clase, persistidos y
   auditables.
2. **Definir workflows** que se disparen por evento, por **cron**, o
   manualmente, y ejecuten una **secuencia de acciones**.
3. Que esas acciones puedan ser:
   - una llamada a un handler interno (enviar notificación, mandar email,
     llamar a otro endpoint, emitir otro evento…),
   - una **espera de tiempo** (`delay 1d`, `delay 30m`),
   - una **espera de evento** (`hasta que llegue user.email_verified para
     este userId, con timeout`),
   - una **rama condicional** sobre el contexto del run.
4. Mantener el estado de cada **run** (instancia viva de un workflow) en
   BBDD, de forma que el motor sobreviva a reinicios y caídas.
5. Ser **extensible**: añadir un nuevo tipo de acción no debe tocar el
   motor — solo registrar un handler nuevo vía DI.

Sigue el mismo patrón hexagonal-no-estricto del resto del repo: un *port* por
responsabilidad externa, adapters en `infrastructure/`, y un **registro de
handlers de acción** equivalente al "driver model" usado por
[storage](./storage-module.md), [mailer](../../../src/modules/mailer/mailer.module.ts)
y [notifications](./notifications-module.md), pero abierto a N tipos en lugar
de a un set cerrado.

### 1.1 Decisiones de alto nivel ya tomadas

| Tema | Decisión |
|---|---|
| Multi-tenant | **Single-tenant en v1.** Sin `tenantId`. |
| Quién define workflows | **Admins desde backoffice.** El DSL llega como JSON al endpoint admin. |
| Quién registra eventos | **Use cases internos** del backend + endpoint admin `POST /workflows/events` (auditoría / replay). No hay endpoint público con API key en v1. |
| Catálogo de event types | **Libres**, validados con regex. Endpoint expone tipos vistos. |
| Versionado | Cada run congela su `definitionId` (incluye versión). Activar una versión nueva **NO** migra runs vivos. |
| Templating | **Mini-evaluador JSONPath propio** (lookup por ruta). Sin code-eval. |
| Matching de triggers / waits | **Mini DSL con operadores** (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `exists`). |
| Scheduler | **Polling MySQL in-process.** Lock optimista por row. Tick 1 s. |
| Triggers | `EVENT` (por event.type + match), `CRON` (UTC, 5 campos estándar), `MANUAL` (desde backoffice / API admin). |
| Allowlist de handlers | **Todos los handlers registrados** son seleccionables desde backoffice. Si algo es peligroso, no se registra. |
| Handler `http.request` | Solo hosts internos vía `WORKFLOWS_HTTP_ALLOWED_HOSTS` (allowlist). |
| Dry-run | **Sí.** Endpoint dedicado; los handlers reciben `ctx.dryRun=true` y no producen side-effects. |
| Concurrencia por workflow | `maxConcurrentRuns` opcional en el DSL. Overflow → **encolar** FIFO. |
| Idempotencia de Event | Campo opcional `idempotencyKey` único; reintentos devuelven el Event original. |
| Secrets en DSL | **No.** `{{ config.X }}` lee namespace público (`WORKFLOWS_CONFIG_*`). Los secrets viven dentro de los handlers. |
| Manejo de error global | Solo retry por step + run `FAILED` + evento `workflow.run_failed`. La limpieza se modela como otro workflow. |
| Sub-workflows | **Fire-and-forget.** Si hace falta esperar, el child emite un evento y el padre usa `wait_for_event`. |
| Steps en paralelo | **No en v1.** Solo flujo lineal con `next` / `onTimeout`. |
| Triggers `CRON` / `MANUAL` | Crean un **Event sintético persistido** (`workflow.cron.<key>` / `workflow.manual.<key>`) para que `event.payload` siga funcionando uniformemente. |
| Payload de Event | JSON válido + tamaño máximo (`WORKFLOWS_EVENT_PAYLOAD_MAX_BYTES`, default 64 KB). |
| Observabilidad | **Logs estructurados** por step/run + `GET /workflows/stats` con contadores agregados. Sin Prometheus en v1. |
| Retención de eventos | **Sin TTL en v1.** Se añade más adelante si duele. |

## 2. Modelo conceptual

```
                ┌─────────────────────────────┐
   evento ───►  │   RegisterEventUseCase      │
   cron tick    │  (persiste Event + dispara) │
   manual run   └──────────┬──────────────────┘
                           │
              ┌────────────┴───────────────┐
              ▼                            ▼
   ┌──────────────────────┐    ┌────────────────────────┐
   │  TriggerMatcher      │    │  WaitMatcher           │
   │  workflows que       │    │  runs WAITING que      │
   │  escuchan ese type   │    │  esperaban ese evento  │
   └──────────┬───────────┘    └──────────┬─────────────┘
              │ crea runs (o encolea      │ consume PendingAction
              │  PENDING_START si full)   │
              ▼                           ▼
                ┌─────────────────────────────┐
                │  AdvanceWorkflowRunUseCase  │
                │  (engine core, transacional)│
                └──────────┬──────────────────┘
                           │
                ┌──────────┴────────────────────────────┐
                ▼                                       ▼
   ┌──────────────────────────┐         ┌─────────────────────────────┐
   │ ActionHandlerRegistry    │         │ Engine-level steps          │
   │ → resuelve action key    │         │  · delay   → PendingAction  │
   │ → ejecuta handler        │         │  · wait_for_event → Pending │
   │   (con ctx.dryRun bool)  │         │  · branch  → next step      │
   └──────┬───────────────────┘         │  · context.set, event.emit  │
          │ resultado                   │  · workflow.start (FAF)     │
          ▼                             └─────────────────────────────┘
   WorkflowStepExecution
   + scheduling del siguiente step
                           ▲
                           │ tick periódico
                ┌──────────┴──────────────────┐
                │  SchedulerWorker            │
                │  · PendingAction.runAt<=NOW │
                │  · CronTrigger.nextFireAt   │
                │  · PENDING_START si hay     │
                │    hueco en maxConcurrent   │
                └─────────────────────────────┘
```

## 3. Conceptos clave (glosario)

| Concepto | Qué es | Dónde vive |
|---|---|---|
| `Event` | hecho ocurrido, inmutable, con `type` y `payload` | `domain/entities` |
| `WorkflowDefinition` | blueprint + DSL, identificado por `key` + `version` | `domain/entities` |
| `WorkflowTrigger` | `(definitionId, kind, …)` — evento, cron o manual | `domain/entities` |
| `WorkflowRun` | instancia con estado, contexto y cursor de step | `domain/entities` |
| `StepDefinition` | un nodo del DSL (acción + input + transiciones) | `domain/dsl` |
| `WorkflowStepExecution` | registro auditado de un step ejecutado | `domain/entities` |
| `PendingAction` | trabajo programado (delay / wait / retry / start) | `domain/entities` |
| `ActionHandler` | port + impl que ejecuta una `action key` | `application/ports` + `infra/handlers` |
| `TemplateEvaluator` | interpola `{{ event.payload.x }}` en los inputs | `application/ports` |
| `MatchExpression` | mini DSL para decidir si un Event matchea | `domain/match` |

## 4. DSL de workflow

El DSL se guarda como JSON en `WorkflowDefinition.dsl`. Se valida con un Zod
schema en `domain/dsl` al publicar; cada input de step se valida contra el
`inputSchema` del handler en el momento de ejecutar.

### 4.1 Esqueleto

```jsonc
{
  "key": "welcome_onboarding",
  "name": "Onboarding de usuario nuevo",
  "version": 1,
  "meta": {
    "maxConcurrentRuns": 100,              // opcional; overflow → cola FIFO
    "description": "…"
  },
  "triggers": [
    {
      "kind": "event",
      "eventType": "user.signed_up",
      "match": { "source": { "eq": "web" } }
    },
    {
      "kind": "cron",
      "cronExpression": "0 9 * * 1",       // todos los lunes a las 09:00 UTC
      "payload": { "campaign": "weekly_digest" }
    },
    {
      "kind": "manual"
    }
  ],
  "context": {                              // valores iniciales del run.context
    "channelPreference": "EMAIL"
  },
  "steps": [
    {
      "key": "send_welcome",
      "action": "notification.send",
      "input": {
        "userId": "{{ event.payload.userId }}",
        "type": "auth.welcome",
        "channels": ["{{ context.channelPreference }}"]
      },
      "retry": { "maxAttempts": 3, "backoff": "exponential" }
    },
    {
      "key": "wait_a_day",
      "action": "delay",
      "input": { "duration": "1d" }
    },
    {
      "key": "wait_verification",
      "action": "wait_for_event",
      "input": {
        "event": "user.email_verified",
        "match": { "userId": { "eq": "{{ event.payload.userId }}" } },
        "timeout": "7d"
      },
      "onTimeout": "send_reminder",
      "onMatch":   "set_verified_flag"
    },
    {
      "key": "set_verified_flag",
      "action": "context.set",
      "input": { "verified": true },
      "next": null
    },
    {
      "key": "send_reminder",
      "action": "notification.send",
      "input": { "...": "..." }
    }
  ]
}
```

### 4.2 Reglas del DSL

- Cada step tiene un `key` único dentro del workflow.
- `next` opcional; si no se indica, pasa al siguiente step del array. `next:
  null` termina el run en `COMPLETED`.
- `onMatch` / `onTimeout` solo aplican a `wait_for_event`. Si no hay
  `onTimeout` y vence el timeout, el run muere `FAILED`.
- `retry` opcional, default `{ maxAttempts: 1 }`. Engine-level actions lo
  ignoran.
- Plantillas: cualquier string del input puede llevar `{{ ... }}`. Scopes
  válidos: `event`, `context`, `steps.<key>.output`, `now`, `config`. **No
  hay `secrets`** — los secrets viven en los handlers (DI).
- `meta.maxConcurrentRuns` opcional. Si no se indica, sin límite.
- Tamaño máximo del DSL serializado: 64 KB (rechazo en publish).

### 4.3 Match expressions

Mini DSL para `trigger.match`, `wait_for_event.match` y `branch.when`. Se
evalúa contra un objeto (típicamente `event.payload` o `run.context`).

```jsonc
// Igualdad simple en una clave plana:
{ "userId": { "eq": "abc" } }

// Equivalente azúcar (igualdad implícita si valor literal):
{ "userId": "abc" }

// Ruta anidada (notación con punto):
{ "address.country": { "eq": "ES" } }

// Operadores soportados:
{ "amount": { "gte": 100, "lt": 10000 } }
{ "status": { "in": ["paid", "refunded"] } }
{ "couponCode": { "exists": false } }
{ "type": { "neq": "internal" } }

// AND implícito entre claves; OR explícito con $or:
{
  "$or": [
    { "amount": { "gte": 1000 } },
    { "vip": { "eq": true } }
  ]
}
```

**Operadores en v1:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`,
`exists`. Y un combinador `$or` a nivel raíz.

### 4.4 Acciones engine-level

Estos handlers viven en el propio módulo `workflows` y tocan estructuras
internas (cola, contexto, eventos).

| `action` | Input | Efecto |
|---|---|---|
| `delay` | `{ duration: "1d" \| "30m" \| <seconds> }` | Crea `PendingAction(kind=DELAY, runAt=now+duration)`. Run pasa a `WAITING`. |
| `wait_for_event` | `{ event, match?, timeout? }` | Crea `PendingAction(kind=WAIT_EVENT, eventType, match)`. Si hay `timeout`, agenda `runAt`. Run pasa a `WAITING`. |
| `branch` | `{ when: <matchExpr>, then: <stepKey>, else?: <stepKey> }` | Evalúa `when` contra el contexto, salta. |
| `context.set` | objeto plano | Hace merge en `run.context`. |
| `event.emit` | `{ type, payload, correlationId? }` | Inserta un `Event` (que reentra por `RegisterEventUseCase`). Por defecto hereda `correlationId` del triggerEvent. |
| `workflow.start` | `{ key, payload? }` | Arranca un run hijo en otro workflow definition. Fire-and-forget. |

### 4.5 Acciones extensibles (registradas por otros módulos)

Cualquier feature puede registrar handlers nuevos. Sugeridas:

| `action` | Módulo | Para qué |
|---|---|---|
| `notification.send` | `notifications` | Envía notificación multicanal. |
| `mailer.send` | `mailer` | Email transaccional puntual. |
| `http.request` | `workflows` (genérico) | POST/GET a hosts allowlisteados. |
| `iam.user.update` | `iam` | Modifica campos de un User. |

## 5. Persistencia (Prisma)

Añadir a [`prisma/schema.prisma`](../../prisma/schema.prisma):

```prisma
enum WorkflowTriggerKind {
  EVENT
  CRON
  MANUAL
}

enum WorkflowRunStatus {
  RUNNING        // hay un step en curso o listo para avanzar
  WAITING        // tiene PendingActions abiertas
  COMPLETED
  FAILED
  CANCELED
}

enum WorkflowStepStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  SKIPPED
}

enum PendingActionKind {
  DELAY            // se consume cuando runAt <= now
  WAIT_EVENT       // se consume cuando llega un Event matching
  RETRY            // reintento programado de un step que falló
  PENDING_START    // un trigger se disparó pero maxConcurrentRuns está lleno
}

enum PendingActionStatus {
  PENDING
  CONSUMED
  CANCELED
}

model Event {
  id              String   @id @default(uuid()) @db.Char(36)
  type            String   @db.VarChar(120)           // "user.signed_up"
  payload         Json
  sourceUserId    String?  @db.Char(36)
  correlationId   String?  @db.Char(36)               // enlaza eventos relacionados
  idempotencyKey  String?  @db.VarChar(120)           // caller la pasa para deduplicar reintentos
  occurredAt      DateTime @default(now())

  triggeredRuns   WorkflowRun[]    @relation("WorkflowRunTrigger")
  consumedBy      PendingAction[]  @relation("PendingActionConsumedEvent")

  @@unique([idempotencyKey])                          // sparse: NULL permitido
  @@index([type, occurredAt])
  @@index([sourceUserId])
  @@index([correlationId])
  @@map("workflow_event")
}

model WorkflowDefinition {
  id          String   @id @default(uuid()) @db.Char(36)
  key         String   @db.VarChar(120)
  version     Int
  name        String   @db.VarChar(200)
  description String?  @db.Text
  dsl         Json                                    // ver §4
  isActive    Boolean  @default(false)                // 1 versión activa por key
  createdAt   DateTime @default(now())
  publishedAt DateTime?

  triggers    WorkflowTrigger[]
  runs        WorkflowRun[]

  @@unique([key, version])
  @@index([key, isActive])
  @@map("workflow_definition")
}

model WorkflowTrigger {
  id                String   @id @default(uuid()) @db.Char(36)
  definitionId      String   @db.Char(36)
  kind              WorkflowTriggerKind

  // kind = EVENT
  eventType         String?  @db.VarChar(120)
  matchExpression   Json?                              // mini DSL §4.3

  // kind = CRON
  cronExpression    String?  @db.VarChar(60)           // 5 campos UTC
  cronPayload       Json?                              // qué payload lleva el Event sintético
  nextFireAt        DateTime?                          // cache; recalculado al disparar

  definition        WorkflowDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict)

  @@index([kind, eventType])                           // matching de eventos
  @@index([kind, nextFireAt])                          // poll del scheduler de crons
  @@index([definitionId])
  @@map("workflow_trigger")
}

model WorkflowRun {
  id              String   @id @default(uuid()) @db.Char(36)
  definitionId    String   @db.Char(36)                // congelado (versión incluida)
  triggerEventId  String?  @db.Char(36)                // Event que lo originó (sintético si CRON/MANUAL)
  status          WorkflowRunStatus @default(RUNNING)
  context         Json     @default("{}")
  currentStepKey  String?  @db.VarChar(120)
  startedAt       DateTime @default(now())
  finishedAt      DateTime?
  lastError       String?  @db.Text
  // Lock optimista del worker:
  lockedBy        String?  @db.VarChar(80)
  lockedUntil     DateTime?

  definition      WorkflowDefinition       @relation(fields: [definitionId], references: [id], onDelete: Restrict)
  triggerEvent    Event?                   @relation("WorkflowRunTrigger", fields: [triggerEventId], references: [id])
  steps           WorkflowStepExecution[]
  pendingActions  PendingAction[]

  @@index([status])
  @@index([definitionId, status])
  @@index([lockedUntil])
  @@map("workflow_run")
}

model WorkflowStepExecution {
  id          String   @id @default(uuid()) @db.Char(36)
  runId       String   @db.Char(36)
  stepKey     String   @db.VarChar(120)
  actionKey   String   @db.VarChar(120)
  status      WorkflowStepStatus @default(PENDING)
  attempt     Int      @default(1)
  input       Json?
  output      Json?
  error       String?  @db.Text
  startedAt   DateTime @default(now())
  finishedAt  DateTime?

  run         WorkflowRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@index([runId, startedAt])
  @@map("workflow_step_execution")
}

model PendingAction {
  id                String   @id @default(uuid()) @db.Char(36)
  runId             String?  @db.Char(36)               // NULL si kind = PENDING_START
  definitionId      String?  @db.Char(36)               // SET si kind = PENDING_START
  triggerEventId    String?  @db.Char(36)               // Event que originó un PENDING_START
  stepKey           String?  @db.VarChar(120)
  kind              PendingActionKind
  status            PendingActionStatus @default(PENDING)
  runAt             DateTime?
  eventType         String?  @db.VarChar(120)
  matchExpression   Json?
  consumedEventId   String?  @db.Char(36)
  createdAt         DateTime @default(now())
  consumedAt        DateTime?

  run               WorkflowRun?         @relation(fields: [runId], references: [id], onDelete: Cascade)
  definition        WorkflowDefinition?  @relation(fields: [definitionId], references: [id], onDelete: Cascade)
  consumedEvent     Event?               @relation("PendingActionConsumedEvent", fields: [consumedEventId], references: [id])

  @@index([status, runAt])                              // poll del scheduler
  @@index([status, eventType])                          // matching de eventos
  @@index([status, kind, definitionId, createdAt])      // FIFO de PENDING_START
  @@index([runId])
  @@map("workflow_pending_action")
}
```

Relaciones inversas en `User` (si interesa el FK):
```prisma
sourcedEvents Event[]
```

Migración:
```bash
pnpm --filter @core/api prisma:migrate -- --name add_workflows
```

> **Decisión:** persistencia MySQL + polling. Cuando duela, swap del
> `PendingActionRepositoryPort` + `SchedulerWorker` a BullMQ/Redis sin tocar
> `application/` ni `domain/`.

## 6. Modelo de ejecución

El motor tiene **3 entrypoints** que convergen en `AdvanceWorkflowRunUseCase`:

1. **Llega un evento** (real o sintético) → `RegisterEventUseCase` persiste el
   Event (deduplicando por `idempotencyKey` si viene), busca triggers
   matching (crea runs o `PENDING_START` si overflow), busca PendingActions
   `WAIT_EVENT` matching (las consume y planifica avance).
2. **Vence un tiempo** → `SchedulerWorker` cada 1 s procesa:
   - PendingActions `DELAY` / `RETRY` / `WAIT_EVENT con timeout vencido` con
     `runAt <= NOW()`.
   - `WorkflowTrigger.kind = CRON` con `nextFireAt <= NOW()` → emite Event
     sintético `workflow.cron.<key>`.
   - PendingActions `PENDING_START` cuando hay hueco bajo `maxConcurrentRuns`.
3. **Llamada manual** (admin) → API admin / replay.

### 6.1 Bucle de `AdvanceWorkflowRunUseCase`

```ts
function advance(runId: string) {
  return tx(async () => {
    const run = await runs.acquireLock(runId);                    // §8 concurrencia
    if (!run || run.status !== "RUNNING") return;

    const dsl = await definitions.findById(run.definitionId);     // versión congelada
    const step = resolveStep(dsl, run.currentStepKey);            // null = inicio
    if (!step) { run.markCompleted(); return; }

    const input = template.render(step.input, {
      event: run.triggerEvent?.payload ?? null,
      context: run.context,
      steps: await steps.outputsFor(run.id),
      now: { iso: new Date().toISOString(), ms: Date.now() },
      config: workflowsConfig.publicScope(),
    });

    const exec = await steps.startExecution(run.id, step, input);

    try {
      if (isEngineAction(step.action)) {
        const result = await engine.execute(step, input, run);
        await steps.complete(exec, result.output);
        if (result.kind === "pause")    { run.status = "WAITING"; return; }
        if (result.kind === "complete") { run.markCompleted(); return; }
        run.currentStepKey = result.nextStepKey;
        scheduler.scheduleAdvance(run.id);
        return;
      }

      const handler = registry.resolve(step.action);
      handler.inputSchema.parse(input);
      const output = await handler.execute(actionCtx(run, { dryRun: false }), input);
      await steps.complete(exec, output);

      run.currentStepKey = resolveNext(dsl, step);
      scheduler.scheduleAdvance(run.id);
    } catch (err) {
      await handleStepError(run, step, exec, err);                // retry / FAILED
    }
  });
}
```

### 6.2 Render de plantillas

`TemplateEvaluator` (port) recibe un valor arbitrario y un contexto y
sustituye los `{{ … }}` por lookup de ruta. Implementación: mini-evaluador
JSONPath simple (`event.payload.userId`, `context.x.y`,
`steps.send_welcome.output.id`, `now.iso`, `config.SUPPORT_EMAIL`). **Sin
code-eval.**

Scope expuesto:

| Scope | Origen |
|---|---|
| `event` | `triggerEvent` del run (`{type, payload, occurredAt, correlationId}`). |
| `context` | `run.context` (mutable vía `context.set`). |
| `steps.<key>.output` | output del step ya ejecutado. |
| `now` | `{ iso, ms }` snapshot. |
| `config` | `WorkflowsConfig.publicScope()` — namespace público (`WORKFLOWS_CONFIG_*`). |

**Nunca** se expone un scope `secrets` desde el evaluador. Los secrets viven
en la DI de los handlers (Stripe handler conoce su key vía `ConfigService`).

### 6.3 Matching de eventos

`WaitMatcher` para cada Event registrado busca PendingActions con:
- `status = PENDING`,
- `kind = WAIT_EVENT`,
- `eventType = event.type`,
- `evalMatch(matchExpression, event.payload) === true` (mini DSL §4.3).

`TriggerMatcher` aplica la misma evaluación contra `workflow_trigger` con
`kind = EVENT`.

### 6.4 Triggers `CRON`

`SchedulerWorker` cada tick selecciona triggers con `nextFireAt <= NOW()`:
1. Calcula la próxima ejecución usando una librería de cron (UTC, 5 campos).
2. Crea un `Event` sintético `{ type: "workflow.cron." + definition.key,
   payload: trigger.cronPayload ?? {} }`.
3. Atomiza con `UPDATE … SET nextFireAt = :next WHERE id = :id AND nextFireAt
   = :prev` (idempotente: si otro tick lo cogió, `affectedRows = 0`).
4. El Event reentra por `RegisterEventUseCase` (mismo camino que cualquier
   otro evento).

### 6.5 Triggers `MANUAL`

`POST /workflows/definitions/:key/run` (admin) crea un Event sintético
`{ type: "workflow.manual." + key, payload: req.body }`. A partir de ahí, el
flujo es el mismo.

### 6.6 Overflow / `maxConcurrentRuns`

`TriggerMatcher` antes de crear un run cuenta los activos
(`RUNNING|WAITING`) por `definitionId`. Si llega a `maxConcurrentRuns`:
- Crea `PendingAction(kind=PENDING_START, definitionId, triggerEventId,
  status=PENDING, createdAt=now)`.

Cuando un run termina (`COMPLETED|FAILED|CANCELED`), un hook
post-transacción consulta `PENDING_START` FIFO para ese `definitionId` y
arranca el siguiente.

### 6.7 Dry-run

`POST /workflows/definitions/:id/dry-run` con `{ payload: …, triggerKind:
"event"|"cron"|"manual" }`. Crea un run efímero `isDryRun=true` (campo
opcional en `WorkflowRun`, default `false`), todos los step executions se
guardan, pero:

- `ActionContext.dryRun = true` → los handlers deben respetar el flag.
- Engine actions: `delay` no programa nada (tiempo virtual), `wait_for_event`
  termina inmediatamente con `onTimeout` simulado, `event.emit` no persiste
  el evento, `workflow.start` no arranca child.
- El run termina en `COMPLETED` o `FAILED` con todo el log; nunca queda
  `WAITING`.

Los handlers externos firman `execute(ctx, input)`; si `ctx.dryRun` es true,
deben devolver una salida verosímil sin tocar nada externo. **Cada módulo es
responsable de su dry-run** (no podemos garantizarlo desde el motor).

## 7. Extensibilidad — registrar nuevos handlers

### 7.1 Port

```ts
// application/ports/action-handler.port.ts
export interface ActionHandlerPort<TInput = unknown, TOutput = unknown> {
  readonly key: string;                          // "notification.send"
  readonly inputSchema: ZodSchema<TInput>;
  readonly outputSchema?: ZodSchema<TOutput>;
  execute(ctx: ActionContext, input: TInput): Promise<TOutput>;
}

export interface ActionContext {
  runId: string;
  definitionKey: string;
  triggerEvent: { type: string; payload: unknown } | null;
  context: Record<string, unknown>;
  dryRun: boolean;
  logger: Logger;
}
```

### 7.2 Registro

Cada feature module declara su handler como provider con el token
`ACTION_HANDLER`. El registry los recoge:

```ts
// src/modules/workflows/workflows.types.ts
export const ACTION_HANDLER = Symbol("workflows.ActionHandler");
```

```ts
// notifications/infrastructure/handlers/send-notification.handler.ts
@Injectable()
export class SendNotificationActionHandler implements ActionHandlerPort {
  readonly key = "notification.send";
  readonly inputSchema = z.object({
    userId: z.string().uuid(),
    type: z.string(),
    channels: z.array(z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"])),
    title: z.string().optional(),
    body: z.string().optional(),
  });
  constructor(private readonly sendNotif: SendNotificationUseCase) {}
  async execute(ctx, input) {
    if (ctx.dryRun) return { simulated: true };
    return this.sendNotif.execute(input);
  }
}
```

```ts
// notifications.module.ts
@Module({
  providers: [
    SendNotificationUseCase,
    { provide: ACTION_HANDLER, useClass: SendNotificationActionHandler },
  ],
  exports: [
    { provide: ACTION_HANDLER, useExisting: SendNotificationActionHandler },
  ],
})
export class NotificationsModule {}
```

### 7.3 El registry

```ts
@Injectable()
export class NestActionHandlerRegistry implements ActionHandlerRegistryPort {
  private readonly map = new Map<string, ActionHandlerPort>();

  constructor(@Inject(ACTION_HANDLER) handlers: ActionHandlerPort[]) {
    for (const h of handlers) {
      if (this.map.has(h.key))
        throw new Error(`Duplicate action handler key: ${h.key}`);
      this.map.set(h.key, h);
    }
  }
  resolve(key: string): ActionHandlerPort {
    const h = this.map.get(key);
    if (!h) throw new ActionHandlerNotFoundError(key);
    return h;
  }
  list(): Array<{ key: string; inputSchema: object }> { /* … */ }
}
```

> **Sobre el multi-provide en Nest:** Nest no tiene `multi: true` nativo. Se
> emula con `@Inject(ACTION_HANDLER)` recolectando providers de los módulos
> que `WorkflowsModule` importe. Alternativa más simple para empezar:
> `WorkflowsModule.forRoot({ handlers: [...] })` desde `app.module.ts`.

### 7.4 Handler `http.request`

Vive en el propio módulo `workflows`. Solo permite hosts en
`WORKFLOWS_HTTP_ALLOWED_HOSTS` (CSV en env). Input:

```ts
z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().positive().max(30_000).default(10_000),
})
```

Antes de hacer la request: parsear `url`, comprobar que `hostname` esté en
la allowlist y que NO resuelva a IP privada/link-local (mitigación SSRF
secundaria por si el DNS apunta dentro).

## 8. Concurrencia y reliability

### 8.1 Locking de runs

Lock optimista por columnas `lockedBy` + `lockedUntil`:

```sql
UPDATE workflow_run
SET    lockedBy = :workerId, lockedUntil = NOW() + INTERVAL 30 SECOND
WHERE  id = :runId AND (lockedUntil IS NULL OR lockedUntil < NOW())
```

Si `affectedRows = 0`, otro worker lo cogió. El TTL evita bloqueos eternos.

### 8.2 Idempotencia

- **Eventos**: `Event.idempotencyKey` opcional, único. `RegisterEvent` con
  una key ya vista devuelve el Event existente sin disparar nada nuevo. Las
  llamadas internas pueden omitirla; las llamadas vía HTTP admin deben
  pasarla si quieren reintentar.
- **Steps**: la tupla `(runId, stepKey, attempt)` es única. Los handlers
  con side-effects externos usan `${runId}.${stepKey}.${attempt}` como
  idempotency key del proveedor.

### 8.3 Retries

`step.retry = { maxAttempts: N, backoff: "linear" | "exponential", baseSeconds?: number }`.

- En fallo: incrementar `attempt`, crear `PendingAction(kind=RETRY,
  runAt=now+backoff)`, run pasa a `WAITING`.
- Tras `maxAttempts` fallos: run `FAILED`, `lastError` poblado, motor emite
  `workflow.run_failed` con `{ runId, definitionKey, stepKey, error }`.
- Las acciones de limpieza / alerta de fallos se modelan como otros
  workflows que escuchan `workflow.run_failed`. **Cero estado especial de
  error en el motor.**

### 8.4 Crash safety

Todo el estado vive en BBDD. Al arrancar la API:
1. Los runs `RUNNING` con `lockedUntil < now` quedan disponibles para que el
   primer worker los retome.
2. Las PendingActions `PENDING` con `runAt <= now` se procesan en el primer
   tick del scheduler.

## 9. Worker / scheduler

```ts
@Injectable()
export class SchedulerWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly intervalMs = +(process.env.WORKFLOWS_SCHEDULER_INTERVAL_MS ?? 1000);

  async onModuleInit() { this.tick(); }
  async onModuleDestroy() { if (this.timer) clearTimeout(this.timer); }

  private async tick() {
    try {
      await this.cronTriggers.fireDueTriggers();          // §6.4
      await this.pendingActions.consumeDueActions(50);    // DELAY / RETRY / timeouts
      await this.pendingActions.startQueuedRuns(50);      // PENDING_START
    } catch (e) { this.logger.error(e); }
    finally { this.timer = setTimeout(() => this.tick(), this.intervalMs); }
  }
}
```

> **Decisión:** un worker en el proceso de API hasta que veamos volumen.
> Cuando se necesite, se mueve a un proceso aparte (`apps/api --worker`) o
> se cambia a BullMQ. La interfaz del use case no cambia.

## 10. Estructura del módulo

```
src/modules/workflows/
├── domain/
│   ├── entities/
│   │   ├── event.entity.ts
│   │   ├── workflow-definition.entity.ts
│   │   ├── workflow-trigger.entity.ts
│   │   ├── workflow-run.entity.ts
│   │   ├── workflow-step-execution.entity.ts
│   │   └── pending-action.entity.ts
│   ├── value-objects/
│   │   ├── duration.vo.ts
│   │   └── cron-expression.vo.ts
│   ├── dsl/
│   │   ├── step-definition.ts            # discriminated union, Zod
│   │   └── workflow-dsl.ts               # schema completo del DSL
│   ├── match/
│   │   ├── match-expression.ts           # tipos del mini DSL
│   │   └── match-evaluator.ts            # pura, sin deps
│   └── errors/
│       ├── invalid-workflow-definition.error.ts
│       ├── invalid-match-expression.error.ts
│       ├── action-handler-not-found.error.ts
│       ├── workflow-run-not-found.error.ts
│       └── workflow-step-failed.error.ts
│
├── application/
│   ├── ports/
│   │   ├── event-repository.port.ts
│   │   ├── workflow-definition-repository.port.ts
│   │   ├── workflow-run-repository.port.ts
│   │   ├── workflow-step-repository.port.ts
│   │   ├── pending-action-repository.port.ts
│   │   ├── workflow-trigger-repository.port.ts
│   │   ├── action-handler.port.ts
│   │   ├── action-handler-registry.port.ts
│   │   ├── template-evaluator.port.ts
│   │   └── workflows-config.port.ts
│   ├── use-cases/
│   │   ├── publish-workflow-definition.use-case.ts
│   │   ├── activate-workflow-definition.use-case.ts
│   │   ├── register-event.use-case.ts
│   │   ├── start-workflow-run.use-case.ts
│   │   ├── trigger-manual-run.use-case.ts
│   │   ├── advance-workflow-run.use-case.ts
│   │   ├── consume-due-pending-actions.use-case.ts
│   │   ├── fire-due-cron-triggers.use-case.ts
│   │   ├── start-queued-runs.use-case.ts
│   │   ├── match-pending-actions-for-event.use-case.ts
│   │   ├── cancel-workflow-run.use-case.ts
│   │   └── dry-run-workflow.use-case.ts
│   └── dto/
│
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-event.repository.ts
│   │   ├── prisma-workflow-definition.repository.ts
│   │   ├── prisma-workflow-trigger.repository.ts
│   │   ├── prisma-workflow-run.repository.ts
│   │   ├── prisma-workflow-step.repository.ts
│   │   └── prisma-pending-action.repository.ts
│   ├── engine/
│   │   ├── engine-actions.executor.ts             # delay, wait_for_event, branch, context.set, event.emit, workflow.start
│   │   └── nest-action-handler.registry.ts
│   ├── handlers/                                  # handlers built-in del módulo workflows
│   │   ├── http-request.handler.ts
│   │   └── log.handler.ts                         # útil para tests/debug
│   ├── template/
│   │   └── jsonpath-template.evaluator.ts
│   ├── cron/
│   │   └── cron-parser.adapter.ts                 # wrapper sobre cron-parser (UTC)
│   ├── config/
│   │   └── env-workflows-config.adapter.ts        # publicScope() lee WORKFLOWS_CONFIG_*
│   ├── workers/
│   │   └── scheduler.worker.ts
│   ├── http/
│   │   ├── dto/
│   │   ├── events.controller.ts                   # POST/GET /workflows/events
│   │   ├── workflows.controller.ts                # CRUD definitions
│   │   ├── workflow-runs.controller.ts            # listar / cancelar / retry
│   │   ├── workflow-handlers.controller.ts        # listar handlers registrados
│   │   └── workflow-stats.controller.ts           # /workflows/stats
│   └── mappers/
│       ├── event.mapper.ts
│       ├── workflow-definition.mapper.ts
│       └── workflow-run.mapper.ts
│
└── workflows.module.ts
```

## 11. API HTTP

Todos bajo `/workflows`, con `@ApiTags('Workflows')`. Todos los endpoints
requieren rol admin (`@Roles('admin')`) salvo nota.

| Método | Path | Descripción |
|---|---|---|
| `POST` | `/workflows/events` | Registra un Event (auditoría/replay). El uso normal es vía use case interno. |
| `GET`  | `/workflows/events?type=&from=&to=` | Listar eventos. |
| `GET`  | `/workflows/events/types` | Lista de event types vistos. |
| `POST` | `/workflows/definitions` | Publicar nueva versión (valida DSL + DSL ≤ 64 KB). |
| `GET`  | `/workflows/definitions` | Listar definiciones (última versión activa por key). |
| `GET`  | `/workflows/definitions/:key` | Detalle versión activa. |
| `GET`  | `/workflows/definitions/:key/versions` | Histórico de versiones. |
| `POST` | `/workflows/definitions/:key/versions/:n/activate` | Activar versión `n` (las anteriores se desactivan; los runs vivos no se tocan). |
| `POST` | `/workflows/definitions/:key/run` | Disparo manual (trigger `MANUAL`). Body = payload del Event sintético. |
| `POST` | `/workflows/definitions/:id/dry-run` | Dry-run con payload simulado (§6.7). |
| `GET`  | `/workflows/runs?status=&definitionKey=&from=` | Listar runs. |
| `GET`  | `/workflows/runs/:id` | Detalle del run + steps + pending. |
| `POST` | `/workflows/runs/:id/cancel` | Cancelar un run en curso. |
| `POST` | `/workflows/runs/:id/retry` | Reintentar el último step fallido. |
| `GET`  | `/workflows/handlers` | Listar `action keys` registradas + sus inputSchema (para que el editor de backoffice las autocompletar). |
| `GET`  | `/workflows/stats` | Contadores agregados: runs vivos por status, PendingActions por kind, runs por workflow definition, throughput de la última hora. |

## 12. Variables de entorno

Todas en `apps/api/.env.local` (no secretos):

| Var | Default | Para qué |
|---|---|---|
| `WORKFLOWS_ENABLED` | `true` | Apagar el motor sin desmontar el módulo. |
| `WORKFLOWS_SCHEDULER_INTERVAL_MS` | `1000` | Cada cuánto despierta el worker. |
| `WORKFLOWS_SCHEDULER_BATCH_SIZE` | `50` | PendingActions por tick. |
| `WORKFLOWS_RUN_LOCK_TTL_MS` | `30000` | TTL del lock optimista del run. |
| `WORKFLOWS_WORKER_ID` | `hostname` | Identifica al worker en `lockedBy`. |
| `WORKFLOWS_EVENT_PAYLOAD_MAX_BYTES` | `65536` | Tope del payload de un Event. |
| `WORKFLOWS_HTTP_ALLOWED_HOSTS` | _(empty)_ | CSV de hosts permitidos para `http.request`. |
| `WORKFLOWS_CONFIG_*` | _(opcional)_ | Cualquier var con este prefijo se expone como `{{ config.<NAME_SIN_PREFIJO> }}` en el DSL. |

## 13. Cómo lo consume el resto del backend

### 13.1 Disparar un evento desde un use case

```ts
@Injectable()
export class SignUpUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly registerEvent: RegisterEventUseCase,
  ) {}

  async execute(input: SignUpInput) {
    const user = await this.users.create(input);
    await this.registerEvent.execute({
      type: "user.signed_up",
      payload: { userId: user.id, email: user.email, source: input.source },
      sourceUserId: user.id,
      // idempotencyKey opcional: pasa la misma si el caller puede reintentar.
    });
    return user;
  }
}
```

### 13.2 Registrar un handler nuevo

Ver §7.2. Resumen: implementar `ActionHandlerPort`, registrarlo como
provider con token `ACTION_HANDLER` en el módulo del feature.

## 14. Tests

- **Unit** (sin Prisma): `domain/dsl` (validación), `domain/match/match-evaluator`,
  `template-evaluator`, `engine-actions.executor` con repos in-memory,
  `cron-parser.adapter` (varios crons UTC + edge cases).
- **Integración** (MySQL local con `./run.sh`):
  - publicar → registrar evento → run avanza hasta `WAITING` en `delay`.
  - `consumeDueActions` mueve run de `WAITING` a `COMPLETED` cuando pasa el
    tiempo (reloj inyectable).
  - `wait_for_event` consume el evento correcto, ignora los que no matchean.
  - Cron trigger dispara y crea Event sintético; `nextFireAt` se actualiza.
  - Manual trigger desde endpoint admin crea Event sintético + run.
  - `maxConcurrentRuns` encolea como `PENDING_START` y arranca al liberar
    hueco.
  - `idempotencyKey` no duplica eventos ni workflows.
  - retry con backoff exponencial deja la traza correcta.
  - dry-run no persiste Event ni PendingAction; los handlers ven
    `ctx.dryRun=true`.
  - `http.request` con host fuera de allowlist → falla; dentro → ok.
- **E2E**: `POST /workflows/definitions` + `POST /workflows/events` +
  `GET /workflows/runs/:id` con un workflow de 4 steps (notification →
  delay → wait_for_event → emit) verificando el log completo.

## 15. Fuera de alcance para v1

- **Multi-tenant** (`tenantId`). Se añade luego sin migrar data.
- **Webhooks externos como trigger.** Cuando haga falta, se mapea
  webhook → event en un controller específico.
- **Steps en paralelo (`parallel`)**. Composición vía `event.emit`.
- **Sub-workflows con espera**. Solo fire-and-forget.
- **Métricas Prometheus.** Solo logs estructurados + `/workflows/stats`.
- **Editor visual / DAG en backoffice.** El backoffice es frontend; aquí
  solo definimos la API.
- **TTL de eventos / archive.** Sin retención automática.
- **Replay de runs históricos.** El endpoint `retry` cubre el caso simple;
  un "replay completo desde un Event" puede venir luego.
- **Catálogo declarado de event types con schema.** Tipos libres + endpoint
  de descubrimiento.

## 16. Roadmap implementación

Orden propuesto (cada bullet ≈ 1 PR autocontenido):

1. Schema Prisma + migración + entidades de dominio + DSL Zod + match-evaluator + template-evaluator (todo unit-testeado, sin motor).
2. Repos Prisma + mappers + `PublishWorkflowDefinitionUseCase` + `ActivateWorkflowDefinitionUseCase` + controller `workflows.controller.ts`.
3. `RegisterEventUseCase` (con idempotencyKey) + `TriggerMatcher` + creación de runs + `events.controller.ts`.
4. `AdvanceWorkflowRunUseCase` con engine actions (`delay`, `context.set`, `branch`, `event.emit`, `workflow.start`).
5. `ActionHandlerRegistry` + handler `http.request` (con allowlist) + handler `log`.
6. `SchedulerWorker` + `ConsumeDuePendingActions` + `StartQueuedRuns` (overflow).
7. `wait_for_event` + `WaitMatcher` + timeouts.
8. Triggers `CRON` + `cron-parser.adapter` + `FireDueCronTriggers`.
9. Trigger `MANUAL` + endpoint `/run` + dry-run (`DryRunWorkflowUseCase` + endpoint).
10. Retries por step + `lastError` + emisión automática de `workflow.run_failed`.
11. Controller `workflow-runs.controller.ts` (cancel/retry) + `workflow-handlers.controller.ts` + `workflow-stats.controller.ts`.
12. Registrar `notification.send` desde `notifications` y `mailer.send` desde `mailer`.
13. Tests de integración + E2E end-to-end.
