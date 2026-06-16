# Spec: @core/forms — schema declarativo de formularios

> **Estado:** draft. Validar contra el primer caso real (alta de usuario) antes de implementar.

## Objetivo

Package `@core/forms` con el schema declarativo de formularios compartido entre todas las apps del
monorepo (web, backoffice, mobile). El backend lo consume **solo** para exponer metadatos de
selectores con repositorio; la validación de payloads de API sigue siendo responsabilidad de los
DTOs de cada módulo NestJS.

## Decisiones clave

- **Package compartido nuevo** `@core/forms` en `packages/forms/`, siguiendo la convención del
  monorepo.
- **Solo schema + tipos + evaluador** de condiciones/validaciones. Los renderers van en packages
  separados por plataforma (`forms-react`, etc.).
- **Selectores con repositorio**: convención sobre configuración. `entity: "User"` auto-expone un
  endpoint genérico vía decorator `@FormRepository`; `endpoint` custom es el escape hatch.
- **Validaciones declarativas y serializables**, catálogo cerrado + `custom.ref` para casos
  puntuales.
- **Forward-compatible**: renderers ignoran `type` desconocidos en vez de crashear.

## Fuera de alcance (de momento)

- Validación de payloads en backend (los DTOs siguen siendo la frontera).
- Forms definidos en BD por usuarios finales (custom fields por tenant).
- Generación automática de columnas Prisma desde el schema.

## Catálogo de field types

Agrupados en 11 familias (~40 tipos):

1. **Texto y contenido** — `text` (con multiline), `richtext`, `email`, `url`, `slug`, `color`, `password`
2. **Numérico** — `number`, `currency`, `percentage`, `range`, `rating`
3. **Fecha y tiempo** — `date`, `time`, `datetime`, `dateRange`, `dateRangeTime`, `month`, `year`, `timezone`
4. **Selección** — `select`, `multiselect`, `radio`, `checkbox`, `toggle`, `tags`, `autocomplete`, `treeSelect`, `cascader`
5. **Identidad y contacto** — `phone`, `otp`, `username` (con availability check async)
6. **Localización** — `address`, `coordinates`, `country`, `locale`, `postalCode`
7. **Password** — con `PasswordPolicy` (minLength, requireUpper/Lower/Digit/Symbol, disallowCommon, maxLength) y strength meter opcional
8. **Archivos** — `file`, `image`, `avatar`, `signature`
9. **Documentos legales/financieros** — `taxId` (DNI/NIF/CIF…), `iban`, `bankAccount`, `creditCard`
10. **Estructurales** — `group`, `array` (repeater), `keyValue`, `json`, `hidden`
11. **UI helpers** — `heading`, `paragraph`, `divider`, `consent`

## Metadatos comunes a todos los fields

```ts
FieldBase {
  name, type, label?, placeholder?, helpText?,
  required?, readOnly?, hidden?, defaultValue?,
  validations?, visibleWhen?, enabledWhen?, dependsOn?,
  permissions?, transformIn?, transformOut?, testId?
}
```

Todas las labels son `I18nKey` (resolución la hace cada renderer con su provider de i18n).

## Selectores con repositorio — contrato backend

Cada entity declarada como form-exposable expone automáticamente:

```
GET /api/forms/repository/:entity?search=&filters=&sort=&page=&pageSize=
GET /api/forms/repository/:entity/:id
```

Los permisos los aplica el backend con el guard de auth del usuario. El módulo se declara con un
decorator tipo `@FormRepository({ entity: "User", searchableFields: [...], labelTemplate: [...] })`.

## Estructura del package

```
packages/forms/
├── package.json              # @core/forms
├── src/
│   ├── index.ts
│   ├── types/                # FieldBase, FormSchema, Validation, Condition, SelectSource
│   ├── registry/              # validators + transforms (runtime refs)
│   ├── evaluate/               # condition.ts, validate.ts
│   └── helpers/defineForm.ts
└── SPEC.md
```

## Preguntas abiertas

1. **i18n** — el package solo declara keys; resolución por renderer (recomendado).
2. **Validación async** — modelar como `Validation { kind: "async", ref }` con endpoint genérico `/api/forms/validate/:ref`.
3. **Permissions** — evaluadas en cliente para UX, re-validadas en backend al submit.
4. **Editor visual** para forms en BD: fuera de alcance, pero el schema debe ser JSON-serializable end-to-end (sin `Function` ni `Symbol`).

## Próximos pasos

- [ ] Validar el spec contra el form de alta de usuario (email, password, role selector desde `Role` entity, locale, timezone)
- [ ] Scaffold del package `@core/forms` con solo los tipos y `defineForm`
- [ ] Primer renderer en `packages/forms-react/` para el backoffice
- [ ] Endpoint genérico `/api/forms/repository/:entity` con el decorator `@FormRepository`
