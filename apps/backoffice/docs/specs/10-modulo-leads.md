# Spec BO-10: Módulo Leads — gestión comercial + timeline + pipeline

> **Estado:** draft
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Gestionar los **leads** (contactos comerciales) desde el backoffice: listar y
filtrar, ver la **ficha de un lead con su timeline**, ejecutar las acciones de
pipeline (cambiar estado, asignar responsable, añadir nota, convertir) y
administrar sus **tags**. Consume la API del módulo `leads`
(ver [`apps/api/docs/specs/leads-module.md`](../../../api/docs/specs/leads-module.md))
y reutiliza los patrones de BO-04 (DataTable), BO-05 (CRUD base) y BO-06/BO-08/BO-09.

## Prerrequisitos

- BO-04 (DataTable), BO-05 (CRUD base), BO-06 (Usuarios), BO-07 (navegación
  dinámica) y BO-09 (blog, para el molde de módulo con listado + tags) completados.
- Módulo `leads` de la API implementado y `@core/api-client` regenerado con sus
  endpoints (`/leads`, `/leads/:id`, `/leads/:id/status`, `/assign`, `/notes`,
  `/convert`, `/tags`, `/leads/:id/activities`).
- Seed de la `Section` `leads` (scope `BACKOFFICE`) cargado, para que aparezca en
  la navegación (ver §12 del spec de API).

## API endpoints usados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/leads?limit=&cursor=&status=&ownerId=&source=&tagId=&q=` | Listado de leads (cursor) |
| GET | `/leads/:id` | Detalle de lead |
| POST | `/leads` | Alta manual |
| PATCH | `/leads/:id` | Editar contacto / customFields / consentimiento |
| POST | `/leads/:id/status` | Cambiar estado (transición validada) |
| POST | `/leads/:id/assign` | Asignar owner |
| POST | `/leads/:id/notes` | Añadir nota al timeline |
| POST | `/leads/:id/convert` | Convertir (→ WON + `convertedToUserId`) |
| PUT | `/leads/:id/tags` | Setear tags (bulk) |
| GET | `/leads/:id/activities?limit=&cursor=` | Timeline (cursor) |

> El contrato real manda: si el API difiere (nombres de filtros, cursor vs
> offset, body de acciones), documentar las desviaciones en este mismo archivo
> como en BO-06/BO-08/BO-09, e implementar contra lo que devuelve el API.

## Tipos y enums

```ts
type LeadStatus =
  | 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST' | 'UNQUALIFIED';

type LeadSource = 'WEB_FORM' | 'MANUAL' | 'IMPORT' | 'API' | 'REFERRAL' | 'OTHER';

type LeadActivityType =
  | 'NOTE' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'SCORE_CHANGE' | 'FORM_SUBMISSION'
  | 'EMAIL' | 'CALL' | 'MEETING' | 'CONVERSION' | 'SYSTEM';

interface LeadRow {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  status: LeadStatus;
  source: LeadSource;
  score: number;
  ownerId?: string;
  owner?: { id: string; firstName?: string; lastName?: string };
  tags: { id: string; name: string; color?: string }[];
  createdAt: string;
  updatedAt: string;
}

interface LeadActivity {
  id: string;
  type: LeadActivityType;
  body?: string;
  meta?: Record<string, unknown>;
  actor?: { id: string; firstName?: string; lastName?: string };
  createdAt: string;
}
```

## Estructura de archivos

```
src/features/leads/
├── LeadsPage.tsx                 # listado (cursor) + filtros
├── LeadDetailPage.tsx            # ficha: datos + timeline + acciones
├── columns.tsx
├── hooks/
│   ├── use-leads.ts
│   ├── use-lead.ts
│   ├── use-lead-activities.ts
│   ├── use-create-lead.ts
│   ├── use-update-lead.ts
│   ├── use-change-lead-status.ts
│   ├── use-assign-lead.ts
│   ├── use-add-lead-note.ts
│   ├── use-convert-lead.ts
│   └── use-set-lead-tags.ts
└── components/
    ├── LeadStatusBadge.tsx
    ├── LeadSourceBadge.tsx
    ├── LeadFilters.tsx           # Select estado + source + owner + búsqueda
    ├── LeadTimeline.tsx          # render del histórico de actividades
    ├── AddNoteForm.tsx
    ├── ChangeStatusDialog.tsx    # solo transiciones válidas desde el estado actual
    ├── AssignLeadDialog.tsx      # Select de usuarios (owner)
    ├── ConvertLeadDialog.tsx     # vínculo a User + confirma paso a WON
    ├── CreateLeadDialog.tsx      # alta manual
    ├── LeadTagsEditor.tsx        # multi-select de tags (popover + command)
    └── (opcional) LeadKanbanBoard.tsx
```

## Hooks (ejemplos)

### `use-leads.ts` (cursor, como Posts en BO-09)

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface UseLeadsParams {
  limit: number;
  cursor?: string;
  status?: LeadStatus;
  ownerId?: string;
  source?: LeadSource;
  tagId?: string;
  q?: string;
}

export function useLeads(params: UseLeadsParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/leads', {
        params: { query: { ...params } },
      });
      if (error) throw error;
      return data;
    },
  });
}
```

### `use-change-lead-status.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useChangeLeadStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { to: LeadStatus; reason?: string }) => {
      const { error } = await apiClient.POST('/leads/{id}/status', {
        params: { path: { id } }, body,
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['lead-activities', id] });
      toast.success('Estado actualizado');
    },
    onError(e: { message?: string }) {
      // 422 → transición inválida: el API valida la máquina de estados
      toast.error(e.message ?? 'No se pudo cambiar el estado');
    },
  });
}
```

(`use-assign-lead`, `use-add-lead-note`, `use-convert-lead`, `use-set-lead-tags`,
`use-update-lead` y `use-create-lead` siguen el mismo molde — copiar de BO-06/BO-09.
Todos invalidan `['leads']`, `['lead', id]` y, cuando toquen el histórico,
`['lead-activities', id]`.)

## `LeadsPage.tsx`

Listado cursor-paginado (modo `cursor` del DataTable, como Posts en BO-09):

```tsx
export function LeadsPage() {
  const [status, setStatus] = useState<LeadStatus | undefined>();
  const [source, setSource] = useState<LeadSource | undefined>();
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const { cursor, next, prev, reset } = useCursorPager();   // helper de BO-06
  const { data, isLoading } = useLeads({ limit: 20, cursor, status, source, ownerId, q });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <CreateLeadDialog />
      </div>
      <LeadFilters
        status={status} source={source} ownerId={ownerId}
        onChange={(f) => { setStatus(f.status); setSource(f.source); setOwnerId(f.ownerId); reset(); }}
      />
      <DataTable
        mode="cursor"
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        meta={data?.meta}
        onNext={next}
        onPrev={prev}
        onSearch={(v) => { setQ(v); reset(); }}
        searchPlaceholder="Buscar por nombre, email o empresa…"
        emptyMessage="No hay leads"
      />
    </div>
  );
}
```

`columns.tsx`: Nombre/Empresa (link a la ficha `/leads/:id`), Email,
`LeadStatusBadge`, `LeadSourceBadge`, Score, Owner (avatar/nombre), Fecha de
alta, y menú de acciones (Ver ficha / Cambiar estado / Asignar / Convertir).

### `LeadStatusBadge.tsx`

```tsx
const STATUS: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW:         { label: 'Nuevo',        variant: 'secondary' },
  CONTACTED:   { label: 'Contactado',   variant: 'outline' },
  QUALIFIED:   { label: 'Cualificado',  variant: 'default' },
  PROPOSAL:    { label: 'Propuesta',    variant: 'default' },
  WON:         { label: 'Ganado',       variant: 'default' },
  LOST:        { label: 'Perdido',      variant: 'destructive' },
  UNQUALIFIED: { label: 'Descartado',   variant: 'outline' },
};
```

## `LeadDetailPage.tsx`

Ficha del lead (`/leads/:id`), dos columnas:

- **Izquierda — actividad**: cabecera con nombre + `LeadStatusBadge` +
  `LeadSourceBadge` + score; `AddNoteForm` para escribir una nota; y
  `LeadTimeline` con el histórico paginado (cursor) de `use-lead-activities`.
- **Derecha — datos y acciones**: bloque de contacto (email, teléfono, empresa,
  `customFields`) editable con `use-update-lead`; `LeadTagsEditor`; bloque de
  atribución (source, UTM, enlace al `formResponseId` si vino de un formulario);
  bloque de consentimiento (fecha de opt-in).
- **Barra de acciones**: `ChangeStatusDialog`, `AssignLeadDialog`,
  `ConvertLeadDialog` (deshabilitado si ya está `WON`).

### `LeadTimeline.tsx`

Renderiza cada `LeadActivity` según su `type`, usando `body` como texto y `meta`
para el detalle. Iconografía por tipo (lucide): `NOTE`→`StickyNote`,
`STATUS_CHANGE`→`ArrowRightLeft`, `ASSIGNMENT`→`UserCheck`,
`CONVERSION`→`Trophy`, `EMAIL`→`Mail`, `CALL`→`Phone`, `MEETING`→`Calendar`,
`SYSTEM`→`Bot`. Orden cronológico descendente; "Cargar más" para siguientes
páginas del cursor.

### `ChangeStatusDialog.tsx`

Solo ofrece las **transiciones válidas** desde el estado actual (espeja la
máquina de §10 del spec de API); el API valida igualmente y devuelve `422` si se
fuerza una inválida. `LOST`/`UNQUALIFIED` piden un `reason` opcional. El paso a
`WON` **no** se hace aquí: se dirige al usuario a `ConvertLeadDialog`.

```ts
const NEXT: Record<LeadStatus, LeadStatus[]> = {
  NEW:         ['CONTACTED', 'UNQUALIFIED', 'LOST'],
  CONTACTED:   ['QUALIFIED', 'UNQUALIFIED', 'LOST'],
  QUALIFIED:   ['PROPOSAL', 'LOST', 'UNQUALIFIED'],
  PROPOSAL:    ['LOST'],           // WON va por ConvertLeadDialog
  WON:         [],
  LOST:        ['NEW'],
  UNQUALIFIED: ['NEW'],
};
```

## Vista Kanban (opcional)

`LeadKanbanBoard.tsx` en `/leads/board`: columnas por `LeadStatus`, tarjetas
arrastrables entre columnas → cada drop llama a `use-change-lead-status`
(respetando las transiciones válidas; un drop inválido se revierte con el toast
de error del `422`). **Fuera de scope de v1** salvo que se priorice: v1 entrega
listado + ficha. Si se implementa, añadir el nodo hijo `leads.board` al seed de
secciones (ver §12 del spec de API).

## Rutas a añadir en `App.tsx`

```tsx
import { LeadsPage } from '@/features/leads/LeadsPage';
import { LeadDetailPage } from '@/features/leads/LeadDetailPage';

<Route path="/leads" element={<LeadsPage />} />
<Route path="/leads/:id" element={<LeadDetailPage />} />
{/* opcional: <Route path="/leads/board" element={<LeadKanbanPage />} /> */}
```

## Navegación (BO-07)

El seed de secciones incluye el nodo `leads` (route `/leads`, icon `Contact`),
así que la navegación dinámica de BO-07 lo muestra automáticamente a los roles
con acceso. Añadir el icono `Contact` al `ICON_MAP` de `src/lib/icons.ts`.

## Componentes shadcn adicionales

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add \
  card dropdown-menu badge select textarea popover command avatar dialog
```

(`popover` + `command` para el multi-select de tags; `avatar` para el owner.)

## Checklist de aceptación

- [ ] `/leads` lista los leads con paginación cursor, skeleton y empty state
- [ ] Filtros por estado, source y owner funcionan y resetean el cursor
- [ ] Búsqueda por nombre/email/empresa con debounce
- [ ] `LeadStatusBadge` y `LeadSourceBadge` con colores diferenciados
- [ ] "Nuevo lead" abre `CreateLeadDialog`; al crear se refresca la lista
- [ ] La ficha muestra datos de contacto, atribución, tags y consentimiento
- [ ] El timeline carga las actividades por cursor con "Cargar más" e iconos por tipo
- [ ] `AddNoteForm` añade una nota y refresca el timeline
- [ ] `ChangeStatusDialog` solo ofrece transiciones válidas; un `422` muestra toast
- [ ] `AssignLeadDialog` cambia el owner y lo refleja en lista y ficha
- [ ] `ConvertLeadDialog` convierte a WON con vínculo a User y se deshabilita si ya está WON
- [ ] `LeadTagsEditor` setea tags (bulk) y se refleja en la lista
- [ ] Todas las listas/fichas se refrescan tras cada mutación sin reload manual
- [ ] La sección aparece en la navegación para los roles con acceso
- [ ] Sin errores TypeScript

## Fuera de scope

- Vista Kanban con drag-and-drop (documentada arriba como opcional).
- Importación masiva (CSV) de leads.
- Editor de reglas de scoring desde el backoffice.
- Merge manual de leads duplicados.
- Envío de emails/SMS al lead desde la ficha (se resuelve vía `workflows` +
  `notifications`, no con UI directa en v1).
- Configuración del pipeline (etapas custom) — el estado es un enum fijo en v1.
