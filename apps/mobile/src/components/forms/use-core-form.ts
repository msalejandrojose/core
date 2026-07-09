import { useCallback, useMemo, useRef, useState } from 'react';
import {
  collectAsyncValidations,
  getDefaultValues,
  validateForm,
  type CustomValidator,
  type FormSchema,
  type FormValues,
} from '@core/forms';

/** Resuelve una validación async del schema contra el backend. */
export type AsyncValidator = (
  ref: string,
  value: unknown,
  values: FormValues,
) => Promise<string | null | undefined>;

export interface UseCoreFormOptions {
  schema: FormSchema;
  /** Valores iniciales; se fusionan sobre los `defaultValue` del schema. */
  initialValues?: FormValues;
  /** Validadores para las validaciones `{ kind: 'custom', ref }`. */
  validators?: Record<string, CustomValidator>;
  /** Resolver de validaciones `{ kind: 'async', ref }` (llama a la API). */
  asyncValidator?: AsyncValidator;
  onSubmit: (values: FormValues) => void | Promise<void>;
}

export interface CoreFormState {
  values: FormValues;
  /** Errores visibles (solo tras tocar el campo o intentar enviar). */
  errors: Record<string, string>;
  submitting: boolean;
  setValue: (name: string, value: unknown) => void;
  /** Marca un campo como tocado (blur) y revalida en caliente. */
  blur: (name: string) => void;
  handleSubmit: () => void;
  reset: (values?: FormValues) => void;
}

/**
 * Estado de un formulario declarativo de `@core/forms`, sin dependencias de
 * framework de formularios (no usamos react-hook-form en mobile). Encapsula:
 *
 * - valores iniciales desde `getDefaultValues` + overrides,
 * - validación **sync** con `validateForm` (respeta visibilidad condicional),
 * - validación **async** por campo con `collectAsyncValidations` (en submit),
 * - errores diferidos: solo se muestran tras `blur` del campo o un intento de
 *   envío, para no gritarle al usuario mientras escribe (patrón del backoffice).
 *
 * El renderer (`FormRenderer`) consume `values`/`errors`/`setValue`/`blur`.
 */
export function useCoreForm({
  schema,
  initialValues,
  validators,
  asyncValidator,
  onSubmit,
}: UseCoreFormOptions): CoreFormState {
  const [values, setValues] = useState<FormValues>(() => ({
    ...getDefaultValues(schema),
    ...initialValues,
  }));
  const [allErrors, setAllErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mantén una ref con los últimos valores para las validaciones async, que se
  // resuelven fuera del ciclo de render.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const asyncRefs = useMemo(() => collectAsyncValidations(schema), [schema]);

  const runSync = useCallback(
    (next: FormValues) => {
      const { errors } = validateForm(schema, next, { validators });
      setAllErrors(errors);
      return errors;
    },
    [schema, validators],
  );

  const setValue = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        // Revalida en caliente solo si ya se mostró error del campo.
        if (touched[name] || submitAttempted) runSync(next);
        return next;
      });
    },
    [touched, submitAttempted, runSync],
  );

  const blur = useCallback(
    (name: string) => {
      setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
      runSync(valuesRef.current);
    },
    [runSync],
  );

  const handleSubmit = useCallback(() => {
    setSubmitAttempted(true);
    const current = valuesRef.current;
    const syncErrors = runSync(current);
    if (Object.keys(syncErrors).length > 0) return;

    void (async () => {
      setSubmitting(true);
      try {
        // Validación async campo a campo (disponibilidad de username, etc.).
        if (asyncValidator && asyncRefs.length > 0) {
          const asyncErrors: Record<string, string[]> = {};
          for (const { field, ref, message } of asyncRefs) {
            const result = await asyncValidator(ref, current[field], current);
            if (result) asyncErrors[field] = [message ?? result];
          }
          if (Object.keys(asyncErrors).length > 0) {
            setAllErrors((prev) => ({ ...prev, ...asyncErrors }));
            return;
          }
        }
        await onSubmit(current);
      } finally {
        setSubmitting(false);
      }
    })();
  }, [runSync, asyncValidator, asyncRefs, onSubmit]);

  const reset = useCallback(
    (nextValues?: FormValues) => {
      setValues({ ...getDefaultValues(schema), ...nextValues });
      setAllErrors({});
      setTouched({});
      setSubmitAttempted(false);
    },
    [schema],
  );

  // Solo exponemos el primer error de cada campo, y solo si es "revelable".
  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [name, messages] of Object.entries(allErrors)) {
      if ((touched[name] || submitAttempted) && messages.length > 0) {
        out[name] = messages[0];
      }
    }
    return out;
  }, [allErrors, touched, submitAttempted]);

  return { values, errors, submitting, setValue, blur, handleSubmit, reset };
}
