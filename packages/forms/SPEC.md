# @core/forms — Spec

Schema declarativo de formularios compartido entre todas las apps del monorepo (web, backoffice, mobile). El backend lo consume **solo** para exponer metadatos de selectores con repositorio (§5); la validación de payloads de API sigue siendo responsabilidad de los DTOs de cada módulo.

> Estado: **draft**. Antes de implementar, validar con el primer caso de uso real (formulario de alta de usuario).

---

## 1. Objetivos

- **Una sola fuente de verdad** de la estructura de un formulario: tipos de campo, validaciones, layout, condicionales, copy.
- **Multiplataforma**: el mismo schema renderiza en React (backoffice), Astro (web) y Ionic/React (mobile). Cada plataforma trae su propio renderer.
- **Tipado fuerte en TS** — los fields son tagged unions, no `Record<string, any>`.
- **Extensible**: añadir un tipo de campo nuevo no obliga a modificar los renderers existentes (registry pattern).

### Fuera de alcance (de momento)

- Validación de payloads en backend (los DTOs de NestJS siguen siendo la frontera).
- Formularios definidos en BD por usuarios finales (custom fields por tenant). Si llega ese caso, el schema servirá igual; lo no resuelto será el editor visual.
- Generación automática de columnas Prisma desde el schema.

---

## 2. Convenciones generales

### 2.1 Estructura raíz

```ts
type FormSchema = {
  id: string;                 // estable, usado para i18n keys y telemetría
  version: number;            // entero, sube cuando rompe compatibilidad
  title?: I18nKey;
  description?: I18nKey;
  fields: Field[];            // orden = orden de render por defecto
  layout?: Layout;            // §7, opcional
  submit?: SubmitConfig;
};
```

### 2.2 Metadatos comunes a TODOS los fields

Todo `Field` extiende esta base. Los tipos concretos (§4) añaden sus propias props.

```ts
type FieldBase = {
  name: string;                       // único dentro del form; clave del payload
  type: FieldType;                    // discriminador de la unión
  label?: I18nKey;
  placeholder?: I18nKey;
  helpText?: I18nKey;
  required?: boolean;                 // default false
  readOnly?: boolean;
  hidden?: boolean;                   // estático; condicional en visibleWhen
  defaultValue?: unknown;             // tipado por field type
  validations?: Validation[];         // §2.3
  visibleWhen?: Condition;            // §6
  enabledWhen?: Condition;            // §6
  dependsOn?: string[];               // names de otros fields (cascada)
  permissions?: { view?: string[]; edit?: string[] }; // rol o permission key
  transformIn?: TransformRef;         // server→form (ej. parse ISO date)
  transformOut?: TransformRef;        // form→server (ej. normalizar phone E.164)
  testId?: string;                    // para e2e
};
```

`I18nKey` es siempre una key (`"users.form.email.label"`), nunca texto plano. Resolución la hace el renderer con el i18n de la plataforma.

`TransformRef` es un identificador de transformación registrada (`"phone.toE164"`), no una función — debe serializarse.

### 2.3 Validaciones

Las validaciones son **declarativas y serializables**. Catálogo cerrado para empezar; el field puede sumar varias.

```ts
type Validation =
  | { kind: "min"; value: number; message?: I18nKey }
  | { kind: "max"; value: number; message?: I18nKey }
  | { kind: "minLength"; value: number; message?: I18nKey }
  | { kind: "maxLength"; value: number; message?: I18nKey }
  | { kind: "pattern"; regex: string; flags?: string; message?: I18nKey }
  | { kind: "email"; message?: I18nKey }
  | { kind: "url"; message?: I18nKey }
  | { kind: "passwordStrength"; policy: PasswordPolicy; message?: I18nKey }
  | { kind: "matchField"; field: string; message?: I18nKey }   // confirm password
  | { kind: "custom"; ref: string; params?: Json; message?: I18nKey };
```

`custom.ref` apunta a un validador registrado en runtime (ej. `"taxId.es"`, `"iban"`).

`required` vive en `FieldBase` por ergonomía (es el caso 80%), no se duplica como `Validation`.

---

## 3. Catálogo de field types

El `type` es el discriminador. Cada uno añade props específicas sobre `FieldBase`.

### 3.1 Texto y contenido

| `type` | Props específicas | Notas |
|---|---|---|
| `text` | `multiline?: boolean`, `maxLength?: number` | Multiline = textarea. |
| `richtext` | `format: "markdown" \| "html"`, `toolbar?: ToolbarPreset` | Renderer-specific WYSIWYG. |
| `email` | — | Auto-añade validación `email`. |
| `url` | — | Auto-añade validación `url`. |
| `slug` | `sourceField?: string`, `separator?: string` | Auto-genera desde `sourceField` si está vacío. |
| `color` | `format?: "hex" \| "rgb" \| "hsl"` | Default `hex`. |
| `password` | `policy: PasswordPolicy`, `showStrengthMeter?: boolean`, `confirmField?: string` | Ver §3.7. |

### 3.2 Numérico

| `type` | Props específicas |
|---|---|
| `number` | `min?`, `max?`, `step?`, `precision?: number` (decimales) |
| `currency` | `currency: string` (ISO 4217, ej. `"EUR"`), `locale?: string`, `min?`, `max?` |
| `percentage` | `min?` (default 0), `max?` (default 100), `precision?` |
| `range` | `min: number`, `max: number`, `step?: number` |
| `rating` | `max?: number` (default 5), `allowHalf?: boolean` |

### 3.3 Fecha y tiempo

| `type` | Props | Devuelve |
|---|---|---|
| `date` | `min?`, `max?` | ISO date `"YYYY-MM-DD"` |
| `time` | `min?`, `max?`, `step?: number` (segundos) | `"HH:mm[:ss]"` |
| `datetime` | `min?`, `max?`, `timezone?: string` | ISO 8601 |
| `dateRange` | `min?`, `max?` | `{ from, to }` ISO date |
| `dateRangeTime` | `min?`, `max?`, `timezone?` | `{ from, to }` ISO 8601 |
| `month` | `min?`, `max?` | `"YYYY-MM"` |
| `year` | `min?`, `max?` | número |
| `timezone` | — | IANA tz string |

### 3.4 Selección

Todos los selectores comparten esta forma:

```ts
type SelectSource =
  | { kind: "static"; options: Option[] }
  | { kind: "repository"; entity: string; query?: RepositoryQuery }
  | { kind: "endpoint"; url: string; method?: "GET" | "POST"; valueKey: string; labelKey: string };

type Option = { value: string | number; label: I18nKey; disabled?: boolean; group?: I18nKey };
```

| `type` | Props específicas |
|---|---|
| `select` | `source: SelectSource`, `searchable?: boolean` |
| `multiselect` | `source: SelectSource`, `min?`, `max?` |
| `radio` | `source: SelectSource` (típicamente `static`), `layout?: "vertical" \| "horizontal"` |
| `checkbox` | — (boolean simple) |
| `toggle` | — (boolean, estilo switch) |
| `tags` | `source?: SelectSource` (sugerencias), `allowCreate?: boolean`, `max?` |
| `autocomplete` | `source: SelectSource`, `minChars?: number` (default 2), `debounceMs?` (default 250) |
| `treeSelect` | `source: SelectSource` con `query.tree: true`, `multiple?` |
| `cascader` | `levels: CascaderLevel[]` (cada uno con su `source`, depende del anterior) |

Detalles de `repository` y `endpoint` en §5.

### 3.5 Identidad y contacto

| `type` | Props |
|---|---|
| `phone` | `defaultCountry?: string` (ISO-3166-1 alpha-2), `format?: "E164" \| "INTERNATIONAL"` |
| `otp` | `length: number` (default 6), `mode?: "numeric" \| "alphanumeric"` |
| `username` | `availabilityCheck?: { entity: string; field: string }` (debounced async via repo) |

### 3.6 Localización

| `type` | Props |
|---|---|
| `address` | `fields?: AddressFieldKey[]` (subset: `street`, `city`, `region`, `postalCode`, `country`) |
| `coordinates` | `withMap?: boolean`, `defaultZoom?: number` |
| `country` | `subset?: string[]` (ISO codes para limitar) |
| `locale` | `subset?: string[]` |
| `postalCode` | `countryField?: string` (depende del country del form para validar formato) |

### 3.7 Password (detalle)

```ts
type PasswordPolicy = {
  minLength: number;          // recomendado: 12
  requireUpper?: boolean;
  requireLower?: boolean;
  requireDigit?: boolean;
  requireSymbol?: boolean;
  disallowCommon?: boolean;   // top-N rockyou check; el renderer lo resuelve client-side
  maxLength?: number;         // hard cap, ej. 128
};
```

El meter de fuerza es responsabilidad del renderer (puede usar zxcvbn). La política viaja en el schema para que todas las plataformas la apliquen igual.

### 3.8 Archivos

| `type` | Props |
|---|---|
| `file` | `accept: string[]` (mime), `maxSizeBytes?`, `multiple?: boolean` |
| `image` | `accept?` (default `["image/*"]`), `maxSizeBytes?`, `crop?: { aspect?: number }` |
| `avatar` | `maxSizeBytes?`, `shape?: "circle" \| "square"` |
| `signature` | `format?: "svg" \| "png"` |

El payload de un file puede ser un upload token, una URL firmada o un blob — lo define el renderer por plataforma. El schema solo describe restricciones.

### 3.9 Documentos legales / financieros

| `type` | Props |
|---|---|
| `taxId` | `country: string` (ISO) — selecciona el validador (`DNI`, `NIF`, `CIF`, `RUT`…) |
| `iban` | — |
| `bankAccount` | `country: string` |
| `creditCard` | `brands?: string[]` (limitar a Visa/MC/Amex…) |

### 3.10 Estructurales

| `type` | Props |
|---|---|
| `group` | `fields: Field[]`, `collapsible?`, `defaultCollapsed?` |
| `array` | `itemFields: Field[]`, `min?`, `max?`, `itemLabel?: I18nKey \| { template: string }` |
| `keyValue` | `keyLabel?`, `valueLabel?`, `keyValidations?`, `valueValidations?` |
| `json` | `schema?: JsonSchema` (opcional, raw editor con validación) |
| `hidden` | — (no se renderiza; sirve para inyectar `defaultValue`) |

### 3.11 UI helpers (no son input)

| `type` | Props |
|---|---|
| `heading` | `level: 1\|2\|3\|4`, `text: I18nKey` |
| `paragraph` | `text: I18nKey` |
| `divider` | — |
| `consent` | `text: I18nKey`, `linkUrl?: string`, `linkText?: I18nKey` (checkbox obligatorio con texto legal) |

---

## 4. Discriminated union

El tipo runtime es:

```ts
type Field =
  | (FieldBase & { type: "text" } & TextProps)
  | (FieldBase & { type: "email" })
  | (FieldBase & { type: "password" } & PasswordProps)
  // … uno por entrada de §3
  ;

type FieldType = Field["type"];
```

Esto fuerza que un renderer haga `switch (field.type)` exhaustivo (`never` check en el default).

---

## 5. Selectores con repositorio

**Decisión:** convención sobre configuración. `kind: "repository"` es el default; `kind: "endpoint"` es el escape hatch.

### 5.1 `repository`

```ts
{
  kind: "repository";
  entity: string;              // ej. "User", "Product" — debe existir en la API
  query?: {
    search?: string;           // término de búsqueda inicial (raro)
    filters?: Record<string, Json>;
    sort?: { field: string; dir: "asc" | "desc" };
    pageSize?: number;         // default 20
    tree?: boolean;            // si la entity tiene jerarquía
  };
  valueKey?: string;           // default "id"
  labelKey?: string | string[];// default "name"; array = template `${a} — ${b}`
}
```

**Contrato del backend:** cada entity declarada como "form-exposable" expone automáticamente:

```
GET /api/forms/repository/:entity?search=&filters=&sort=&page=&pageSize=
GET /api/forms/repository/:entity/:id           # resolver un valor a su label
```

Los permisos los aplica el backend con el guard de auth del usuario actual. Si el usuario no tiene `read` sobre la entity, el endpoint devuelve 403 y el renderer muestra el selector deshabilitado con mensaje.

**Cómo declarar una entity como exposable** (ver §9 — implementación pendiente):
en el módulo de la feature, registrar el repositorio con un metadato (`@FormRepository({ entity: "User", searchableFields: ["email", "fullName"], labelTemplate: ["fullName"] })`). El módulo `forms-api` (en `apps/api`) agrupa esos registros y monta el endpoint genérico.

### 5.2 `endpoint`

Para casos que no encajan (ej. catálogos externos, búsqueda federada):

```ts
{
  kind: "endpoint";
  url: string;                 // absoluto o relativo a la API
  method?: "GET" | "POST";
  valueKey: string;
  labelKey: string;
  // payload de búsqueda lo construye el renderer con { q, page, pageSize }
}
```

---

## 6. Condicionales

```ts
type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { field: string; op: "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "truthy" | "falsy"; value?: Json };
```

- `visibleWhen`: si la condición es falsa, el field no se renderiza Y su valor se omite del payload.
- `enabledWhen`: si es falsa, se renderiza disabled (el valor sí se envía).
- `dependsOn`: opcional pero recomendado — declara las dependencias explícitamente para que el renderer optimice re-evaluaciones.

---

## 7. Layout

```ts
type Layout =
  | { kind: "stack" }                                   // default, uno debajo de otro
  | { kind: "grid"; columns: number; rows?: GridRow[] } // grid CSS-like
  | { kind: "tabs"; tabs: { id: string; title: I18nKey; fields: string[] }[] }
  | { kind: "stepper"; steps: { id: string; title: I18nKey; fields: string[] }[] };
```

Los layouts referencian fields por `name`; no duplican la definición.

---

## 8. Submit y estado

```ts
type SubmitConfig = {
  label?: I18nKey;                // default "Submit"
  endpoint?: { url: string; method: "POST" | "PUT" | "PATCH" };
  // si no hay endpoint, el renderer expone un onSubmit(values) al consumidor
  successMessage?: I18nKey;
  resetOnSuccess?: boolean;
};
```

---

## 9. Estructura del package

```
packages/forms/
├── package.json              # @core/forms, private, workspace:*
├── src/
│   ├── index.ts              # re-exporta tipos y registry
│   ├── types/
│   │   ├── field.ts          # FieldBase + discriminated union
│   │   ├── validation.ts
│   │   ├── condition.ts
│   │   ├── source.ts         # SelectSource
│   │   └── form.ts           # FormSchema
│   ├── registry/
│   │   ├── validators.ts     # registro runtime de `custom.ref`
│   │   └── transforms.ts     # registro runtime de TransformRef
│   ├── evaluate/
│   │   ├── condition.ts      # evalúa Condition contra un payload
│   │   └── validate.ts       # ejecuta Validation[] contra un valor
│   └── helpers/
│       └── defineForm.ts     # helper tipado para construir FormSchema
└── SPEC.md                   # este documento
```

**No incluye renderers.** Cada plataforma tendrá su propio package:
- `packages/forms-react/` — para backoffice y mobile (comparten React).
- `packages/forms-astro/` — para la web pública si necesita formularios (probable que no, o pocos).

El backend solo consume `@core/forms` para los tipos del endpoint genérico de repositorio.

---

## 10. Versionado y compatibilidad

- El campo `version` en `FormSchema` es entero monotónico. Sube en cambios **incompatibles** (eliminar un field, cambiar el tipo de uno existente, cambiar el shape del payload).
- Añadir un field nuevo con `defaultValue` definido **no** rompe compatibilidad.
- Los renderers ignoran fields con `type` desconocido y muestran un warning de consola en dev. Esto permite que una mobile app desplegada hace meses no crashee contra un schema más nuevo.

---

## 11. Preguntas abiertas

Cosas a resolver antes de implementar:

1. **i18n**: ¿el package `@core/forms` resuelve las keys o solo las declara? Recomendación: solo declara. La resolución es del renderer (cada plataforma tiene su provider de i18n).
2. **Errores de validación async** (username availability, taxId remoto): ¿cómo se modelan? Opción: `Validation` con `kind: "async"; ref: string` que el renderer ejecuta vía endpoint genérico `/api/forms/validate/:ref`.
3. **Permissions**: ¿se evalúan en cliente o solo en backend? Recomendación: cliente evalúa para UX (ocultar/deshabilitar), backend re-valida en submit.
4. **Editor visual** para forms dinámicos en BD: fuera de alcance pero el schema debe ser JSON-serializable end-to-end (ningún `Function` ni `Symbol` en ninguna prop) para que ese caso quede abierto.

---

## 12. Próximos pasos

1. Validar este spec contra el form de **alta de usuario** (campos reales: email, password, role selector desde `Role` entity, locale, timezone).
2. Crear el package `@core/forms` con solo los tipos (§9) y un helper `defineForm`.
3. Implementar el primer renderer en `packages/forms-react/` para el backoffice.
4. Implementar el endpoint genérico `/api/forms/repository/:entity` con el decorador `@FormRepository`.
