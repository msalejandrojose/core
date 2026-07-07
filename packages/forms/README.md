# @core/forms

Schema declarativo de formularios, **framework-agnóstico, sin dependencias y
JSON-serializable**. Es el núcleo compartido entre apps (backoffice, web,
mobile); los renderers viven en cada plataforma.

> Diseño completo en [`SPEC.md`](./SPEC.md). Este package es la **v1** (TASK-79):
> un subconjunto acotado de tipos de campo validado contra un caso real (el alta
> de usuario del backoffice).

## Qué incluye

- **Catálogo completo de tipos de campo** (`types/field.ts`): las 11 familias del
  [`SPEC.md`](./SPEC.md) (~50 tipos) — texto/contenido (`text`, `textarea`,
  `richtext`, `email`, `url`, `slug`, `color`, `password` con `PasswordPolicy`),
  numérico (`number`, `currency`, `percentage`, `range`, `rating`), fecha/tiempo
  (`date`, `time`, `datetime`, `month`, `year`, `timezone`, `dateRange`,
  `dateRangeTime`), selección (`select`, `multiselect`, `radio`, `checkbox`,
  `toggle`, `tags`, `autocomplete`, `treeSelect`, `cascader`), identidad
  (`phone`, `otp`, `username`), localización (`address`, `coordinates`,
  `country`, `locale`, `postalCode`), archivos (`file`, `image`, `avatar`,
  `signature`), legales/financieros (`taxId`, `iban`, `bankAccount`,
  `creditCard`), estructurales (`group`, `array`, `keyValue`, `json`, `hidden`)
  y helpers de UI (`heading`, `paragraph`, `divider`, `consent`). Unión
  discriminada **forward-compatible**: los renderers ignoran tipos desconocidos
  en lugar de romper.
- **Validación** (`validation/`): catálogo cerrado (`required`, `minLength`,
  `maxLength`, `min`, `max`, `pattern`, `email`, `url`, `integer`, `phone`,
  `iban`, `taxId`, `creditCard`, `custom.ref`) + evaluador puro
  `validateForm(schema, values, options?)`. Los validadores de formato (IBAN
  mod-97, NIF/NIE/CIF, Luhn, teléfono, URL) están en `validation/formats.ts` y
  se exportan sueltos (`isIban`, `isTaxId`, `isLuhnValid`…).
- **Condiciones** (`conditions/`): `visibleWhen` / `enabledWhen` con operadores
  simples (`eq`, `ne`, `in`, `nin`, `truthy`, `falsy`, `gt/gte/lt/lte`) y
  combinadores `all` / `any` / `not`. Evaluador puro.
- **Helpers** (`helpers/`): `defineForm` (identidad tipada con inferencia),
  `getDefaultValues` (con fallback por tipo para cada value object),
  `collectDataFields`, `findDataField`, e `InferFormValues<S>`.

Ya implementado además del núcleo: el **endpoint de opciones por repositorio**
(`GET /forms/repository/:entity`, con repos `Role`/`Country`), la **validación
async** (`{ kind: 'async', ref }` + `POST /forms/validate/:ref`, resuelta desde
el resolver del backoffice) y **renderers** de casi todo el catálogo en el
backoffice, incluidos `file`/`image`/`avatar` (suben al módulo de storage).

Todavía pendiente (ver spec): renderers de `richtext`, `signature`, `treeSelect`,
`cascader` y `array` (necesitan widgets dedicados), y extraer el renderer a un
package `forms-react` separado.

## Uso

```ts
import { defineForm, validateForm, getDefaultValues } from '@core/forms';

const form = defineForm({
  id: 'alta-cliente',
  fields: [
    { type: 'email', name: 'email', label: 'Email',
      validations: [{ kind: 'required' }, { kind: 'email' }] },
    { type: 'select', name: 'tipo', defaultValue: 'PARTICULAR',
      options: [
        { value: 'PARTICULAR', label: 'Particular' },
        { value: 'EMPRESA', label: 'Empresa' },
      ] },
    // Solo visible (y validado) si tipo === EMPRESA
    { type: 'text', name: 'cif', required: true,
      visibleWhen: { field: 'tipo', op: 'eq', value: 'EMPRESA' } },
  ],
});

const values = getDefaultValues(form);
const result = validateForm(form, values); // { valid, errors }
```

El renderer React de referencia está en
`apps/backoffice/src/features/forms/` (`FormRenderer` + `coreFormsResolver`),
pensado para extraerse a `packages/forms-react` cuando exista `@core/ui`.

## Tests

```bash
pnpm --filter @core/forms test
```

Usan `node:test` con type-stripping nativo de Node 22
(`node --test --experimental-strip-types`), sin paso de build.
