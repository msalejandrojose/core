import type { I18nKey } from './json.ts';

/**
 * Catálogo cerrado de validaciones declarativas y serializables.
 *
 * `message` es opcional: si no se indica, el evaluador usa un mensaje por
 * defecto en español (ver `validation/messages.ts`). Para lógica que no encaja
 * en el catálogo se usa `custom` con una `ref` que se resuelve contra un
 * registro de validadores en runtime (las funciones nunca viajan en el schema).
 */
export type Validation =
  | { kind: 'required'; message?: I18nKey }
  | { kind: 'minLength'; value: number; message?: I18nKey }
  | { kind: 'maxLength'; value: number; message?: I18nKey }
  | { kind: 'min'; value: number; message?: I18nKey }
  | { kind: 'max'; value: number; message?: I18nKey }
  | { kind: 'pattern'; value: string; flags?: string; message?: I18nKey }
  | { kind: 'email'; message?: I18nKey }
  | { kind: 'custom'; ref: string; message?: I18nKey };

export type ValidationKind = Validation['kind'];
