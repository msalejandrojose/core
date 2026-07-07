# Spec de campos (`fields`) de los formularios dinámicos

Esta es la **fuente de verdad** de qué campos existen, qué propiedades admite
cada uno, cómo se validan en la API y con qué componente se editan/renderizan en
el backoffice. Vale para el módulo `dynamic-forms` de la API, el paquete
compartido `@core/forms` y la feature `dynamic-forms` del backoffice.

## 1. Las dos formas de un campo

Un mismo campo vive en **dos representaciones** que se traducen entre sí:

| Forma | Dónde vive | Discriminador de valor | Validaciones |
|---|---|---|---|
| **Persistida** (`FormFieldSchema`) | `Form.schema` (JSON en BBDD), API, builder del backoffice | `key` | propiedades sueltas (`required`, `minLength`, `pattern`…) |
| **Declarativa** (`Field`) | renderer/validador de `@core/forms` | `name` | array `validations[]` |

El adaptador `apiSchemaToCoreSchema` (en `@core/forms`) convierte la persistida
en la declarativa, de modo que **un solo renderer** pinta tanto el _preview_ del
builder como el formulario público, garantizando paridad WYSIWYG.

```
FormSchemaJson (persistida)  ──apiSchemaToCoreSchema──▶  FormSchema (declarativa)
        ▲                                                        │
        │ edita el builder                                       ▼
   FieldEditorPanel                                        FormRenderer + validateForm
```

## 2. `FormSchemaJson` — envoltura persistida

```jsonc
{
  "version": 1,
  "fields": [ /* FormFieldSchema[] */ ]
}
```

- `version` (**number**, obligatorio): versión del schema. Hoy `1`.
- `fields` (**array**, obligatorio): lista de campos. Las `key` deben ser únicas.

## 3. Propiedades comunes a todos los campos

| Propiedad | Tipo | Aplica a | Notas |
|---|---|---|---|
| `key` | string | todos | Identificador del campo en `answers`. No vacío, **sin espacios**, único. |
| `type` | enum | todos | Uno de los 9 tipos de §4. |
| `label` | string? | todos | Etiqueta visible. |
| `placeholder` | string? | todos menos `checkbox`* | *En `checkbox` se reutiliza como texto junto a la casilla. |
| `helpText` | string? | todos | Texto de ayuda bajo el campo. |
| `required` | boolean? | todos | Obligatoriedad. En `checkbox` obliga a marcarlo (`true`). |

## 4. Catálogo de tipos

Los **9 tipos** soportados en la v1. El set es idéntico en la API
(`field-spec.ts` → `FIELD_TYPES`), en `@core/forms` (`FormFieldType`) y en el
builder (`schema.ts` → `FIELD_TYPES`).

| `type` | Etiqueta builder | Propiedades específicas | Forma del valor en `answers` | Componente de render |
|---|---|---|---|---|
| `text` | Texto | `minLength`, `maxLength`, `pattern` | `string` | `<Input type="text">` |
| `textarea` | Texto largo | `minLength`, `maxLength`, `pattern`, `rows` | `string` | `<Textarea>` |
| `email` | Email | `minLength`, `maxLength`, `pattern` | `string` (formato email) | `<Input type="email">` |
| `number` | Número | `min`, `max`, `step` | `number` \| `null` | `<Input type="number">` |
| `date` | Fecha | — | `string` `YYYY-MM-DD` | `<Input type="date">` |
| `select` | Desplegable | `options[]` | `string` (∈ options) | `<Select>` |
| `multiselect` | Selección múltiple | `options[]` | `string[]` (⊆ options) | grupo de `<Checkbox>` |
| `radio` | Opción única | `options[]` | `string` (∈ options) | `<RadioGroup>` |
| `checkbox` | Casilla (sí/no) | — (usa `placeholder` como texto) | `boolean` | `<Checkbox>` |

### Propiedades por tipo

- **`options`** (`select` / `multiselect` / `radio`): array de `{ value, label }`.
  Obligatorio y no vacío. `value` no vacío y **único** dentro del campo.
- **`minLength` / `maxLength`** (`text` / `textarea` / `email`): enteros ≥ 0 y
  `minLength ≤ maxLength`.
- **`pattern`** (`text` / `textarea` / `email`): regex **sin delimitadores**
  (`^[0-9]{9}$`), compilable.
- **`min` / `max`** (`number`): números con `min ≤ max`.
- **`step`** (`number`): número > 0 (pista de UI; no se fuerza al validar).
- **`rows`** (`textarea`): entero ≥ 1.

> Nota: `hidden`/`password`/`toggle`/`group`/`heading`/`divider` existen en el
> schema **declarativo** de `@core/forms` (para formularios definidos en código)
> pero **no** en el schema persistido v1 que produce el builder.

## 5. Validación en la API

Toda la lógica vive en `apps/api/src/modules/dynamic-forms/application/validators/`.

### 5.1 Del schema — al crear/actualizar un formulario

`validateFormSchema(schema)` (`form-schema.validator.ts`) valida la forma
completa: tipo soportado, `key` válida/única, coherencia de `min/max` y
`minLength/maxLength`, regex compilable, `step > 0`, `rows ≥ 1`, y opciones
válidas/únicas en los campos de selección. Un fallo lanza
`FormSchemaInvalidError` → **HTTP 422 `FORM_SCHEMA_INVALID`**.

### 5.2 De las respuestas — al enviar (`POST /public/forms/:hash/responses`)

`validateFormAnswers(schema, answers)` (`form-answers.validator.ts`) es la **red
de seguridad autoritativa** del backend (no confía en el cliente). Valida cada
campo del schema contra el valor enviado:

- **required**: vacío → error; en `checkbox`, exige `true`.
- **texto**: tipo string, `minLength`/`maxLength`, `pattern`, formato email.
- **número**: numérico (coacciona strings), `min`/`max`.
- **date**: formato `YYYY-MM-DD` y fecha real.
- **select/radio**: el valor debe pertenecer a `options`.
- **multiselect**: array cuyos elementos ⊆ `options`, sin repetidos.
- Las `key` desconocidas en `answers` se ignoran (forward-compatible).

Un fallo lanza `FormResponseInvalidError` → **HTTP 422 `FORM_RESPONSE_INVALID`**
(detalle por campo en `context.fields`). La misma validación declarativa corre
en el cliente vía `validateForm` de `@core/forms`, así que el usuario ve los
errores en vivo y el servidor los reconfirma.

## 6. Componentes del backoffice

`apps/backoffice/src/features/dynamic-forms/`:

| Componente | Rol |
|---|---|
| `FieldBuilder` | Lista de campos con drag & drop (dnd-kit) + menú de "añadir campo" por tipo. |
| `SortableFieldRow` | Fila arrastrable de un campo dentro del builder. |
| `FieldEditorPanel` | Editor de **todas** las propiedades del campo seleccionado (key, label, placeholder, helpText, required, opciones, min/max, longitudes, pattern, rows). |
| `FormPreview` | Preview en vivo usando el `FormRenderer` compartido. |

`apps/backoffice/src/features/forms/`:

| Pieza | Rol |
|---|---|
| `FormRenderer` | Mapea cada `type` a su componente shadcn + react-hook-form. |
| `coreFormsResolver` | Adapta `validateForm` de `@core/forms` al resolver de react-hook-form. |

## 7. Añadir un tipo de campo nuevo

Para que un tipo nuevo sea coherente end-to-end hay que tocar, en orden:

1. `packages/forms/src/persisted/types.ts` → añadir a `FormFieldType` y sus props.
2. `packages/forms/src/persisted/adapter.ts` → mapear a la forma declarativa.
3. `apps/api/.../validators/field-spec.ts` → añadir a `FIELD_TYPES` (+ sets).
4. `apps/api/.../validators/form-schema.validator.ts` → reglas del schema.
5. `apps/api/.../validators/form-answers.validator.ts` → validación de la respuesta.
6. `apps/backoffice/.../dynamic-forms/schema.ts` → `FIELD_TYPES` + `makeField`.
7. `apps/backoffice/.../dynamic-forms/components/FieldEditorPanel.tsx` → editor de props.
8. `apps/backoffice/.../forms/FormRenderer.tsx` → componente de render.

> Regla de oro: los renderers **ignoran** los tipos que no conocen en vez de
> romper (forward-compatible), así que añadir un tipo no rompe clientes viejos.
