import {
  apiSchemaToCoreSchema,
  getDefaultValues,
  isDataField,
  isFieldVisible,
  validateForm,
  type DataField,
  type FormValues,
} from '@core/forms';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  fetchPublicForm,
  submitPublicForm,
  type PublicFormResponse,
} from '../../lib/forms';

type Phase = 'loading' | 'ready' | 'error';
type SubmitStatus = 'idle' | 'submitting' | 'success';

const inputCls =
  'w-full px-4 py-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)] transition text-sm';

/** Lee el hash de la instancia de la query string (`?f=<hash>`). */
function readHash(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('f');
}

export default function DynamicForm({ hash: hashProp }: { hash?: string } = {}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<PublicFormResponse | null>(null);
  const [loadError, setLoadError] = useState<{ code: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    // Prioriza el hash pasado por prop (p.ej. la página de captación con el
    // hash de su FormInstance); si no, lo lee de la query string (`?f=`).
    const hash = hashProp || readHash();
    if (!hash) {
      setLoadError({
        code: 'NO_HASH',
        message: 'Falta el identificador del formulario en el enlace.',
      });
      setPhase('error');
      return;
    }
    fetchPublicForm(hash)
      .then((res) => {
        setData(res);
        setPhase('ready');
      })
      .catch((err: unknown) => {
        const code = err instanceof ApiError ? err.code : 'UNKNOWN';
        const message =
          err instanceof ApiError
            ? err.message
            : 'No se pudo cargar el formulario. Inténtalo de nuevo más tarde.';
        setLoadError({ code, message });
        setPhase('error');
      });
  }, [hashProp]);

  if (phase === 'loading') {
    return (
      <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Cargando formulario…
      </p>
    );
  }

  if (phase === 'error' || !data) {
    return <StatusCard title={errorTitle(loadError?.code)} message={loadError?.message} />;
  }

  if (data.instance.requiresAuth) {
    return (
      <StatusCard
        title="Este formulario requiere iniciar sesión"
        message="No está disponible desde el enlace público. Accede a tu cuenta para completarlo."
      />
    );
  }

  return <FormBody data={data} />;
}

function errorTitle(code?: string): string {
  switch (code) {
    case 'FORM_INSTANCE_CLOSED':
      return 'Este formulario ya no está disponible';
    case 'FORM_INSTANCE_NOT_FOUND':
    case 'NO_HASH':
      return 'Enlace no válido';
    default:
      return 'No se pudo cargar el formulario';
  }
}

function FormBody({ data }: { data: PublicFormResponse }) {
  const { form, instance } = data;
  const schema = useMemo(
    () => apiSchemaToCoreSchema(form.schema),
    [form.schema],
  );
  const dataFields = useMemo(
    () => schema.fields.filter(isDataField),
    [schema],
  );

  const [values, setValues] = useState<FormValues>(() => {
    const defaults = getDefaultValues(schema);
    // Precarga cualquier campo cuyo `key` coincida con un parámetro de la URL.
    // Sirve para los campos ocultos de atribución (`utm_source`, etc.).
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      for (const field of dataFields) {
        const v = params.get(field.name);
        if (v != null && v !== '') defaults[field.name] = v;
      }
    }
    return defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = validateForm(schema, values);
    if (!result.valid) {
      const flat: Record<string, string> = {};
      for (const [name, messages] of Object.entries(result.errors)) {
        flat[name] = messages[0];
      }
      setErrors(flat);
      return;
    }

    setStatus('submitting');
    setSubmitError(null);
    try {
      await submitPublicForm(instance.hash, values);
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar la respuesta. Inténtalo de nuevo.',
      );
    }
  };

  if (status === 'success') {
    return (
      <StatusCard
        title="¡Respuesta enviada!"
        message="Gracias por completar el formulario."
      />
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
          {form.title}
        </h1>
        {form.description && (
          <p className="mt-3 text-base leading-relaxed text-fg-muted">
            {form.description}
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {dataFields.map((field) =>
          isFieldVisible(field, values) ? (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              onChange={(v) => setValue(field.name, v)}
            />
          ) : null,
        )}

        {submitError && (
          <p className="text-sm" style={{ color: 'oklch(0.55 0.18 25)' }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-md px-6 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-brand)' }}
        >
          {status === 'submitting' ? 'Enviando…' : 'Enviar respuesta'}
        </button>
      </form>
    </div>
  );
}

interface FieldControlProps {
  field: DataField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

function FieldControl({ field, value, error, onChange }: FieldControlProps) {
  const label = field.label ?? field.name;
  const placeholder = field.placeholder;
  const required = Boolean(field.required);

  // El checkbox lleva su propia disposición (casilla + texto en línea).
  if (field.type === 'checkbox') {
    return (
      <div>
        <label className="flex items-start gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 size-4 accent-[color:var(--color-brand)]"
          />
          <span>
            {label}
            {required && <span className="text-brand"> *</span>}
            {placeholder && (
              <span className="block text-fg-muted">{placeholder}</span>
            )}
          </span>
        </label>
        <FieldMeta helpText={field.helpText} error={error} />
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={field.name}
        className="mb-2 block text-sm font-medium text-fg"
      >
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <Control
        field={field}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
      <FieldMeta helpText={field.helpText} error={error} />
    </div>
  );
}

function Control({
  field,
  value,
  placeholder,
  onChange,
}: {
  field: DataField;
  value: unknown;
  placeholder?: string;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          id={field.name}
          rows={field.rows ?? 4}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-none`}
        />
      );
    case 'number':
      return (
        <input
          id={field.name}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value == null ? '' : (value as number)}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : e.target.valueAsNumber)
          }
          className={inputCls}
        />
      );
    case 'select':
      return (
        <select
          id={field.name}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="" disabled>
            {placeholder ?? 'Selecciona una opción'}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => {
            const id = `${field.name}-${opt.value}`;
            return (
              <label
                key={opt.value}
                htmlFor={id}
                className="flex items-center gap-2 text-sm text-fg"
              >
                <input
                  id={id}
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={value === opt.value}
                  disabled={opt.disabled}
                  onChange={() => onChange(opt.value)}
                  className="size-4 accent-[color:var(--color-brand)]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string, checked: boolean) =>
        onChange(checked ? [...selected, v] : selected.filter((x) => x !== v));
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => {
            const id = `${field.name}-${opt.value}`;
            return (
              <label
                key={opt.value}
                htmlFor={id}
                className="flex items-center gap-2 text-sm text-fg"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  disabled={opt.disabled}
                  onChange={(e) => toggle(opt.value, e.target.checked)}
                  className="size-4 accent-[color:var(--color-brand)]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    }
    case 'date':
      return (
        <input
          id={field.name}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
    case 'email':
      return (
        <input
          id={field.name}
          type="email"
          autoComplete="off"
          value={(value as string) ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
    default:
      return (
        <input
          id={field.name}
          type="text"
          value={(value as string) ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
  }
}

function FieldMeta({ helpText, error }: { helpText?: string; error?: string }) {
  if (error) {
    return (
      <p className="mt-1.5 text-xs" style={{ color: 'oklch(0.55 0.18 25)' }}>
        {error}
      </p>
    );
  }
  if (helpText) {
    return <p className="mt-1.5 text-xs text-fg-subtle">{helpText}</p>;
  }
  return null;
}

function StatusCard({ title, message }: { title: string; message?: string }) {
  return (
    <div
      className="p-10 text-center"
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-muted)',
      }}
    >
      <p className="text-lg font-semibold" style={{ color: 'var(--color-fg)' }}>
        {title}
      </p>
      {message && (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          {message}
        </p>
      )}
    </div>
  );
}
