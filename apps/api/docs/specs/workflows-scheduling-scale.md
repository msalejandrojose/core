# Spec/ADR — Escala del scheduler de workflows: MySQL vs BullMQ/Redis

> Estado: **decisión tomada — quedarse en MySQL con hardening**
> Owner: backend
> Última edición: 2026-07-06
> Contexto: subtarea de _Workflows v2_ (TASK-73). Evaluar si el scheduling
> actual sobre MySQL aguanta a escala o conviene migrar a una cola
> (BullMQ/Redis), y documentar la decisión.

## 1. Cómo funciona hoy

Todo el estado vive en MySQL. No hay cola ni worker dedicado; el "reloj" es un
`@Cron(EVERY_MINUTE)` en `WorkflowSchedulerService.tick()` que hace dos cosas:

1. **Triggers cron** — `findDueCronTriggers(now)` trae los triggers `CRON` de
   definiciones activas con `nextFireAt <= now` (o null), y por cada uno:
   reprograma `nextFireAt` (reserva de slot) y dispara vía `StartWorkflowRuns`.
2. **Trabajo diferido** — `ResumeDuePendingActionsUseCase` consume las
   `PendingAction` vencidas (`runAt <= now`) de tipo `DELAY`, `RETRY`,
   `WAIT_CONDITION` y `WAIT_EVENT` (timeout), reanudando cada run.

Piezas relevantes para la escala:

- **Índices**: `workflow_pending_action` tiene `@@index([status, runAt])` y
  `@@index([status, eventType])`; `workflow_run` tiene `@@index([status])` y
  `@@index([lockedUntil])`. Las consultas de polling van por índice.
- **Reclamo atómico**: `PendingAction.markConsumed(id)` es un
  `updateMany WHERE status = PENDING` → solo **un** llamante gana la acción.
  Ese es el candado que hace segura la reanudación de runs (el `advance` va
  siempre detrás de un claim ganado).
- **Campos de lock sin usar**: `WorkflowRun.lockedBy` / `lockedUntil` existen en
  el schema pero hoy no se usan (previstos para el worker distribuido).

## 2. La pregunta

¿El diseño MySQL + `@Cron` por minuto aguanta el crecimiento, o hay que migrar
ya a BullMQ/Redis?

Dos ejes distintos que conviene no mezclar:

- **Throughput / latencia** (¿cuántos runs/min, con qué retardo?).
- **Correctitud multi-instancia** (¿qué pasa con 2+ réplicas del API?).

## 3. Análisis

### 3.1 Throughput y latencia

- El polling por minuto sobre índices `(status, runAt)` es barato: incluso con
  decenas de miles de `PendingAction` pendientes, `findDue` con `take = 50` es
  una lectura indexada trivial. MySQL sirve esto de sobra hasta **miles de
  runs/minuto** sin despeinarse.
- **Límite real: granularidad de 1 minuto.** Un `delay` de "30s" o un poll de
  `wait_for_condition` no puede resolverse antes del siguiente tick. Si el
  producto necesita **delays sub-minuto** o reacción "en segundos", el tick por
  minuto es insuficiente — pero eso se arregla bajando el intervalo del `@Cron`
  (p.ej. cada 10–15s), no migrando de almacén.
- El `batch` (`DEFAULT_BATCH = 50`) acota cuántas acciones se procesan por
  pasada. A volumen alto habría que subirlo o paginar dentro del tick; de nuevo,
  un parámetro, no una migración.

**Conclusión del eje 1:** MySQL no es el cuello de botella al horizonte
previsible de este producto. El cuello sería la granularidad del tick, ajustable.

### 3.2 Correctitud multi-instancia

Con **una** instancia del API, el diseño es correcto. Con **varias réplicas**,
cada una corre su propio `@Cron`, y ahí hay una asimetría importante:

- **Reanudación de runs (pending actions): SEGURA.** `markConsumed` es un
  `updateMany` condicionado a `status = PENDING`; si dos instancias ven la misma
  acción vencida, solo una la reclama y solo una avanza el run. ✅
- **Disparo de triggers cron: NO seguro (doble disparo).**
  `updateNextFireAt` hace un `update` **incondicional**. Dos instancias pueden
  leer el mismo trigger con `nextFireAt <= now` en el mismo minuto y ambas
  dispararlo antes de reprogramarlo → el workflow arranca **dos veces**. ❌

Es decir: el único agujero real de concurrencia hoy no es "MySQL vs Redis", sino
que **la reserva del slot cron no es atómica**.

## 4. Opciones

### Opción A — Seguir en MySQL (con hardening)

- **Pros**: cero infraestructura nueva (Redis), un solo almacén (backups,
  transacciones, observabilidad ya montadas), el modelo `PendingAction` ya cubre
  delay/retry/wait/timeout, y el reclamo atómico ya resuelve la parte difícil.
- **Contras**: granularidad limitada por el intervalo del `@Cron`; a muy alta
  escala el polling y la contención de escrituras crecerían; el fan-out masivo
  sigue siendo trabajo del proceso, no de un pool de workers.
- **Hardening necesario**:
  1. **Claim atómico del slot cron** (updateMany condicionado a `nextFireAt`) —
     _implementado junto a esta decisión_ (ver §6).
  2. Bajar el intervalo del tick si se necesitan delays sub-minuto.
  3. Usar `lockedBy`/`lockedUntil` o un `advisory lock` si en el futuro el
     `advance` de un run largo pudiera solaparse (hoy va tras un claim, así que
     no es urgente).

### Opción B — Migrar a BullMQ/Redis

- **Pros**: scheduling con retardo nativo y sub-segundo, reintentos con backoff
  de serie, workers horizontales, colas por prioridad, métricas/inspección con
  Bull Board.
- **Contras**: **nueva pieza de infra** (Redis: despliegue, HA, backups,
  coste); **doble fuente de verdad** (estado del run en MySQL + jobs en Redis) y
  la sincronización/at-least-once que eso implica; reescritura del
  scheduler/resumer y de la reprogramación de cron; más superficie operativa.
  Buena parte de lo que aporta (retries con backoff, waits, timeouts) **ya está
  implementado** sobre `PendingAction`.

## 5. Decisión

**Quedarse en MySQL.** Para el volumen y la operativa actuales, migrar a
BullMQ/Redis es sobre-ingeniería: añade una dependencia de infraestructura y una
segunda fuente de verdad para resolver un problema (throughput) que hoy no
tenemos, mientras que el problema que **sí** tenemos (doble disparo de cron en
multi-instancia) se arregla con un `updateMany` condicionado, sin salir de MySQL.

### Umbrales para reconsiderar (revisit if…)

Migrar a una cola dedicada pasa a estar justificado cuando se dé **cualquiera**
de estos:

- **Latencia**: se necesita ejecutar delays/acciones con precisión **sub-10s** de
  forma sostenida (bajar el tick deja de ser suficiente/eficiente).
- **Volumen**: > ~**5.000 runs/minuto** sostenidos, o `PendingAction` pendientes
  en el orden de **millones**, donde el polling y la contención de escritura en
  MySQL empiecen a notarse en métricas.
- **Operativa**: se despliegan **muchas** réplicas del API y se quiere separar el
  procesamiento de workflows en un pool de workers dedicado (aislar CPU/memoria
  del tráfico HTTP).

Mientras no se cruce ninguno, el coste/beneficio favorece MySQL.

## 6. Trabajo concreto

**Hecho ahora (hardening no-regret):**

- **Claim atómico del slot cron.** `updateNextFireAt` pasa a ser condicional
  (`updateMany WHERE id AND nextFireAt = <valor leído>`) y devuelve si el
  llamante reclamó el slot; el scheduler **solo dispara si lo reclamó**. Elimina
  el doble disparo en multi-instancia sin infraestructura nueva.

**Follow-ups (cuando toque, no urgentes):**

- Parametrizar el intervalo del tick (env) y subir el `batch`/paginar si el
  volumen lo pide.
- Lock de `advance` por run (`lockedBy`/`lockedUntil` o advisory lock) si algún
  día el avance de un run pudiera solaparse fuera del claim.
- Reevaluar BullMQ/Redis si se cruzan los umbrales de §5.
