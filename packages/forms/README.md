# @core/forms

Schema declarativo de formularios, **framework-agnóstico, sin dependencias y
JSON-serializable**. Es el núcleo compartido entre apps (backoffice, web,
mobile); los renderers viven en cada plataforma.

> Diseño completo en [`SPEC.md`](./SPEC.md). Este package es la **v1** (TASK-79):
> un subconjunto acotado de tipos de campo validado contra un caso real (el alta
> de usuario del backoffice).

## Qué incluye la v1

- **Tipos de campo** (`types/`): `text`, `textarea`, `email`, `password`,
  `number`, `select`, `multiselect`, `checkbox`, `toggle`, `date`, `hidden`,
  `group` + helpers `heading` / `divider`. Unión discriminada **forward-compatible**:
  los renderers ignoran tipos desconocidos en lugar de romper.
- **Validación** (`validation/`): catálogo cerrado (`required`, `minLength`,
  `maxLength`, `min`, `max`, `pattern`, `email`, `custom.ref`) + evaluador puro
  `validateForm(schema, values, options?)`.
- **Condiciones** (`conditions/`): `visibleWhen` / `enabledWhen` con operadores
  simples (`eq`, `ne`, `in`, `nin`, `truthy`, `falsy`, `gt/gte/lt/lte`) y
  combinadores `all` / `any` / `not`. Evaluador puro.
- **Helpers** (`helpers/`): `defineForm` (identidad tipada con inferencia),
  `getDefaultValues`, `collectDataFields`, `findDataField`, e `InferFormValues<S>`.

Fuera de la v1 (ver spec): catálogo completo (~40 tipos), endpoint backend
`/api/forms/repository/:entity` + `@FormRepository`, validación async y el
package `forms-react` separado (el renderer vive de momento en el backoffice).

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
