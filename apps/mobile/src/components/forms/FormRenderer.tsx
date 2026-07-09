import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonRadio,
  IonRadioGroup,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
} from '@ionic/react';
import {
  addOutline,
  closeOutline,
  cloudUploadOutline,
  star,
  starOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  collectDataFields,
  isFieldEnabled,
  isFieldVisible,
  type AddressValue,
  type ArrayField,
  type CoordinatesValue,
  type DataField,
  type Field,
  type FileRef,
  type FormSchema,
  type FormValues,
  type KeyValueEntry,
  type TreeOption,
} from '@core/forms';
import { uploadFormFile } from './upload';
import { FieldWrapper } from './FieldWrapper';
import './forms.css';

type Translate = (key: string) => string;

export interface FormRendererProps {
  schema: FormSchema;
  values: FormValues;
  errors: Record<string, string>;
  setValue: (name: string, value: unknown) => void;
  blur: (name: string) => void;
  /** Resuelve `I18nKey` → texto. Por defecto identidad (sin i18n todavía). */
  translate?: Translate;
  /** Fuerza todos los campos deshabilitados (modo solo lectura). */
  disabled?: boolean;
}

interface Ctx {
  values: FormValues;
  errors: Record<string, string>;
  setValue: (name: string, value: unknown) => void;
  blur: (name: string) => void;
  t: Translate;
  formDisabled: boolean;
}

/**
 * Renderer de `@core/forms` para Ionic (MOB-08). Mapea los tipos de campo del
 * schema a componentes Ion nativos, con el mismo criterio que el renderer React
 * del backoffice pero con el look táctil del DS mobile.
 *
 * Forward-compatible: un tipo futuro sin control cae a un aviso en dev, no
 * rompe el render. El estado (valores/errores/validación) lo aporta
 * `useCoreForm`; este componente es presentacional.
 */
export function FormRenderer({
  schema,
  values,
  errors,
  setValue,
  blur,
  translate = (k) => k,
  disabled = false,
}: FormRendererProps) {
  const ctx: Ctx = {
    values,
    errors,
    setValue,
    blur,
    t: translate,
    formDisabled: disabled,
  };
  return (
    <div className="core-form">
      {schema.fields.map((field, i) => (
        <RenderField key={fieldKey(field, i)} field={field} ctx={ctx} />
      ))}
    </div>
  );
}

function fieldKey(field: Field, index: number): string {
  if ('name' in field && field.name) return field.name;
  return `${field.type}-${index}`;
}

function RenderField({ field, ctx }: { field: Field; ctx: Ctx }) {
  if (!isFieldVisible(field, ctx.values)) return null;

  switch (field.type) {
    case 'group':
      return (
        <div
          className="core-form"
          style={
            field.columns && field.columns > 1
              ? {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${field.columns}, 1fr)`,
                  gap: 12,
                }
              : undefined
          }
        >
          {field.fields.map((child, i) => (
            <RenderField key={fieldKey(child, i)} field={child} ctx={ctx} />
          ))}
        </div>
      );
    case 'heading': {
      const size = field.level === 1 ? 18 : field.level === 3 ? 14 : 16;
      return (
        <p className="core-form-heading" style={{ fontSize: size }}>
          {ctx.t(field.text)}
        </p>
      );
    }
    case 'paragraph':
      return <p className="core-form-paragraph">{ctx.t(field.text)}</p>;
    case 'divider':
      return <hr className="core-form-divider" />;
    case 'hidden':
      return null;
    default:
      return <DataControl field={field} ctx={ctx} />;
  }
}

function DataControl({ field, ctx }: { field: DataField; ctx: Ctx }) {
  const disabled = ctx.formDisabled || !isFieldEnabled(field, ctx.values);
  const label = field.label ? ctx.t(field.label) : '';
  const placeholder = field.placeholder ? ctx.t(field.placeholder) : undefined;
  const helpText = field.helpText ? ctx.t(field.helpText) : undefined;
  const error = ctx.errors[field.name];
  const value = ctx.values[field.name];

  // Los booleanos inline (toggle/checkbox/consent) llevan su propio layout.
  const inlineBoolean =
    field.type === 'toggle' ||
    field.type === 'checkbox' ||
    field.type === 'consent';

  const control = renderControl(field, {
    value,
    disabled,
    placeholder,
    hasError: Boolean(error),
    set: (v) => ctx.setValue(field.name, v),
    blur: () => ctx.blur(field.name),
    t: ctx.t,
  });

  if (inlineBoolean) {
    // El label va dentro de la fila inline; el wrapper solo aporta error/ayuda.
    return (
      <div className="core-form-field">
        {control}
        {error ? (
          <p className="core-form-error" role="alert">
            {error}
          </p>
        ) : helpText ? (
          <p className="core-form-help">{helpText}</p>
        ) : null}
      </div>
    );
  }

  return (
    <FieldWrapper
      label={label}
      required={field.required}
      helpText={helpText}
      error={error}
    >
      {control}
    </FieldWrapper>
  );
}

interface ControlApi {
  value: unknown;
  disabled: boolean;
  placeholder: string | undefined;
  hasError: boolean;
  set: (v: unknown) => void;
  blur: () => void;
  t: Translate;
}

function textClass(hasError: boolean) {
  return `core-control${hasError ? ' has-error' : ''}`;
}

function renderControl(field: DataField, api: ControlApi) {
  const { value, disabled, placeholder, hasError, set, blur } = api;
  const str = (value as string) ?? '';

  switch (field.type) {
    // --- Texto e identificadores (IonInput) ------------------------------
    case 'text':
    case 'username':
    case 'country':
    case 'locale':
    case 'postalCode':
    case 'timezone':
    case 'taxId':
    case 'iban':
    case 'bankAccount':
      return <TextControl type="text" api={api} value={str} />;
    case 'email':
      return (
        <TextControl type="email" api={api} value={str} inputmode="email" />
      );
    case 'url':
      return <TextControl type="url" api={api} value={str} inputmode="url" />;
    case 'phone':
      return <TextControl type="tel" api={api} value={str} inputmode="tel" />;
    case 'slug':
      return <TextControl type="text" api={api} value={str} />;
    case 'password':
      return <TextControl type="password" api={api} value={str} />;
    case 'creditCard':
      return (
        <TextControl type="text" api={api} value={str} inputmode="numeric" />
      );
    case 'otp':
      return (
        <TextControl
          type="text"
          api={api}
          value={str}
          inputmode="numeric"
          maxlength={field.length ?? 6}
        />
      );
    case 'color':
      return (
        <input
          type="color"
          className="core-form-native"
          value={str || '#000000'}
          disabled={disabled}
          onChange={(e) => set(e.target.value)}
          onBlur={blur}
        />
      );

    // --- Texto largo ------------------------------------------------------
    case 'textarea':
    case 'richtext': // v1: richtext cae a textarea (HTML plano)
      return (
        <IonTextarea
          className={textClass(hasError)}
          autoGrow
          rows={field.type === 'textarea' ? field.rows : undefined}
          value={str}
          placeholder={placeholder}
          disabled={disabled}
          onIonInput={(e) => set(e.detail.value ?? '')}
          onIonBlur={blur}
        />
      );
    case 'json':
      return <JsonControl value={value} api={api} />;

    // --- Numéricos --------------------------------------------------------
    case 'number':
      return (
        <NumberControl
          api={api}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    case 'year':
      return (
        <NumberControl api={api} min={field.min} max={field.max} step={1} />
      );
    case 'currency':
      return (
        <NumberControl
          api={api}
          min={field.min}
          max={field.max}
          step={0.01}
          suffix={field.currency ?? 'EUR'}
        />
      );
    case 'percentage':
      return (
        <NumberControl
          api={api}
          min={field.min ?? 0}
          max={field.max ?? 100}
          suffix="%"
        />
      );
    case 'range':
      return (
        <IonRange
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={typeof value === 'number' ? value : field.min}
          disabled={disabled}
          pin
          onIonInput={(e) => set(e.detail.value as number)}
          onIonBlur={blur}
        />
      );
    case 'rating':
      return <RatingControl api={api} max={field.max ?? 5} />;

    // --- Fecha / hora (inputs nativos del WebView) -----------------------
    case 'date':
      return <TextControl type="date" api={api} value={str} />;
    case 'time':
      return <TextControl type="time" api={api} value={str} />;
    case 'datetime':
      return <TextControl type="datetime-local" api={api} value={str} />;
    case 'month':
      return <TextControl type="month" api={api} value={str} />;

    // --- Selección --------------------------------------------------------
    case 'select':
    case 'autocomplete':
      return (
        <IonSelect
          className={textClass(hasError)}
          value={str}
          placeholder={placeholder ?? 'Selecciona'}
          disabled={disabled}
          interface="action-sheet"
          onIonChange={(e) => set(e.detail.value)}
          onIonBlur={blur}
        >
          {(field.options ?? []).map((opt) => (
            <IonSelectOption
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      );
    case 'multiselect':
      return (
        <IonSelect
          className={textClass(hasError)}
          multiple
          value={Array.isArray(value) ? value : []}
          placeholder={placeholder ?? 'Selecciona'}
          disabled={disabled}
          onIonChange={(e) => set(e.detail.value)}
          onIonBlur={blur}
        >
          {(field.options ?? []).map((opt) => (
            <IonSelectOption
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      );
    case 'radio':
      return (
        <IonRadioGroup value={str} onIonChange={(e) => set(e.detail.value)}>
          <div className="core-form-options">
            {(field.options ?? []).map((opt) => (
              <label key={opt.value} className="core-form-option">
                <IonRadio
                  value={opt.value}
                  disabled={disabled || opt.disabled}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </IonRadioGroup>
      );

    // --- Booleanos inline -------------------------------------------------
    case 'checkbox':
    case 'toggle':
    case 'consent': {
      const labelText =
        field.type === 'consent'
          ? field.text
          : (field.label ? api.t(field.label) : '') || placeholder || '';
      const Control =
        field.type === 'toggle' ? (
          <IonToggle
            checked={Boolean(value)}
            disabled={disabled}
            onIonChange={(e) => set(e.detail.checked)}
          />
        ) : (
          <IonCheckbox
            checked={Boolean(value)}
            disabled={disabled}
            onIonChange={(e) => set(e.detail.checked)}
          />
        );
      return (
        <label className="core-form-inline">
          <span className="core-form-inline-label">{labelText}</span>
          {Control}
        </label>
      );
    }

    // --- Etiquetas libres -------------------------------------------------
    case 'tags':
      return <TagsControl api={api} />;

    // --- Compuestos -------------------------------------------------------
    case 'address':
      return <AddressControl api={api} />;
    case 'coordinates':
      return <CoordinatesControl api={api} />;
    case 'keyValue':
      return <KeyValueControl api={api} />;

    // --- Archivos ---------------------------------------------------------
    case 'file':
      return (
        <FileControl
          api={api}
          accept={field.accept}
          multiple={field.multiple ?? false}
        />
      );
    case 'image':
      return (
        <FileControl
          api={api}
          accept={field.accept ?? ['image/*']}
          multiple={field.multiple ?? false}
        />
      );
    case 'avatar':
      return <FileControl api={api} accept={['image/*']} multiple={false} />;

    // --- Firma táctil -----------------------------------------------------
    case 'signature':
      return <SignatureControl api={api} />;

    // --- Jerárquicos ------------------------------------------------------
    case 'treeSelect':
      return (
        <TreeSelectControl
          api={api}
          options={field.options}
          multiple={field.multiple ?? false}
        />
      );
    case 'cascader':
      return <CascaderControl api={api} options={field.options} />;

    // --- Repetidor --------------------------------------------------------
    case 'array':
      return <ArrayControl api={api} field={field} />;

    default:
      if (import.meta.env.DEV) {
        console.warn(
          `[forms] tipo de campo sin renderer todavía: "${field.type}"`,
        );
      }
      return null;
  }
}

// --- Sub-controles ----------------------------------------------------------

function TextControl({
  type,
  api,
  value,
  inputmode,
  maxlength,
}: {
  type: string;
  api: ControlApi;
  value: string;
  inputmode?: 'text' | 'email' | 'url' | 'tel' | 'numeric' | 'decimal';
  maxlength?: number;
}) {
  return (
    <IonInput
      className={textClass(api.hasError)}
      type={type as never}
      value={value}
      placeholder={api.placeholder}
      disabled={api.disabled}
      inputmode={inputmode}
      maxlength={maxlength}
      onIonInput={(e) => api.set(e.detail.value ?? '')}
      onIonBlur={api.blur}
    />
  );
}

function NumberControl({
  api,
  min,
  max,
  step,
  suffix,
}: {
  api: ControlApi;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const input = (
    <IonInput
      className={textClass(api.hasError)}
      type="number"
      inputmode="decimal"
      min={min}
      max={max}
      step={step != null ? String(step) : undefined}
      value={api.value == null ? '' : (api.value as number)}
      placeholder={api.placeholder}
      disabled={api.disabled}
      onIonInput={(e) => {
        const raw = e.detail.value;
        api.set(raw === '' || raw == null ? null : Number(raw));
      }}
      onIonBlur={api.blur}
    />
  );
  if (!suffix) return input;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1 }}>{input}</div>
      <span style={{ color: 'var(--core-muted)', fontSize: 14 }}>{suffix}</span>
    </div>
  );
}

function RatingControl({ api, max }: { api: ControlApi; max: number }) {
  const value = typeof api.value === 'number' ? api.value : 0;
  return (
    <div className="core-form-stars" role="radiogroup">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? 'on' : ''}
          disabled={api.disabled}
          aria-label={`${n}`}
          onClick={() => api.set(n === value ? null : n)}
        >
          <IonIcon icon={n <= value ? star : starOutline} />
        </button>
      ))}
    </div>
  );
}

function TagsControl({ api }: { api: ControlApi }) {
  const tags = Array.isArray(api.value) ? (api.value as string[]) : [];
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && !tags.includes(t)) api.set([...tags, t]);
    setDraft('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tags.length > 0 ? (
        <div className="core-form-chips">
          {tags.map((t) => (
            <span key={t} className="core-form-chip">
              {t}
              <button
                type="button"
                aria-label={`Quitar ${t}`}
                disabled={api.disabled}
                onClick={() => api.set(tags.filter((x) => x !== t))}
              >
                <IonIcon icon={closeOutline} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <IonInput
        className={textClass(api.hasError)}
        value={draft}
        placeholder={api.placeholder ?? 'Añade y pulsa Intro'}
        disabled={api.disabled}
        onIonInput={(e) => setDraft(e.detail.value ?? '')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onIonBlur={api.blur}
      />
    </div>
  );
}

function AddressControl({ api }: { api: ControlApi }) {
  const val =
    api.value && typeof api.value === 'object'
      ? (api.value as AddressValue)
      : {};
  const set = (patch: Partial<AddressValue>) => api.set({ ...val, ...patch });
  const field = (key: keyof AddressValue, ph: string, half = false) => (
    <IonInput
      className={`core-control${half ? '' : ''}`}
      value={val[key] ?? ''}
      placeholder={ph}
      disabled={api.disabled}
      onIonInput={(e) => set({ [key]: e.detail.value ?? '' })}
      onIonBlur={api.blur}
    />
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {field('line1', 'Dirección')}
      {field('line2', 'Dirección (línea 2)')}
      <div className="core-form-grid2">
        {field('city', 'Ciudad', true)}
        {field('region', 'Provincia / Región', true)}
      </div>
      <div className="core-form-grid2">
        {field('postalCode', 'Código postal', true)}
        {field('country', 'País', true)}
      </div>
    </div>
  );
}

function CoordinatesControl({ api }: { api: ControlApi }) {
  const val =
    api.value && typeof api.value === 'object'
      ? (api.value as CoordinatesValue)
      : null;
  const set = (patch: Partial<CoordinatesValue>) =>
    api.set({ lat: val?.lat ?? 0, lng: val?.lng ?? 0, ...patch });
  return (
    <div className="core-form-grid2">
      <IonInput
        className="core-control"
        type="number"
        inputmode="decimal"
        placeholder="Latitud"
        value={val?.lat ?? ''}
        disabled={api.disabled}
        onIonInput={(e) => set({ lat: Number(e.detail.value || 0) })}
        onIonBlur={api.blur}
      />
      <IonInput
        className="core-control"
        type="number"
        inputmode="decimal"
        placeholder="Longitud"
        value={val?.lng ?? ''}
        disabled={api.disabled}
        onIonInput={(e) => set({ lng: Number(e.detail.value || 0) })}
        onIonBlur={api.blur}
      />
    </div>
  );
}

function KeyValueControl({ api }: { api: ControlApi }) {
  const rows = Array.isArray(api.value) ? (api.value as KeyValueEntry[]) : [];
  const update = (i: number, patch: Partial<KeyValueEntry>) =>
    api.set(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <IonInput
            className="core-control"
            value={row.key}
            placeholder="clave"
            disabled={api.disabled}
            onIonInput={(e) => update(i, { key: e.detail.value ?? '' })}
          />
          <IonInput
            className="core-control"
            value={row.value}
            placeholder="valor"
            disabled={api.disabled}
            onIonInput={(e) => update(i, { value: e.detail.value ?? '' })}
          />
          <IonButton
            fill="clear"
            color="danger"
            disabled={api.disabled}
            onClick={() => api.set(rows.filter((_, idx) => idx !== i))}
          >
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonButton>
        </div>
      ))}
      <IonButton
        fill="clear"
        size="small"
        disabled={api.disabled}
        onClick={() => api.set([...rows, { key: '', value: '' }])}
      >
        <IonIcon slot="start" icon={addOutline} />
        Añadir
      </IonButton>
    </div>
  );
}

function JsonControl({ value, api }: { value: unknown; api: ControlApi }) {
  const [text, setText] = useState(() => {
    try {
      return value == null ? '' : JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  });
  const [error, setError] = useState<string | null>(null);
  const onChange = (v: string) => {
    setText(v);
    if (v.trim() === '') {
      setError(null);
      api.set(null);
      return;
    }
    try {
      api.set(JSON.parse(v));
      setError(null);
    } catch {
      setError('JSON no válido');
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <IonTextarea
        className={textClass(api.hasError || Boolean(error))}
        style={{ fontFamily: 'ui-monospace, monospace' }}
        autoGrow
        rows={5}
        value={text}
        placeholder={api.placeholder ?? '{ }'}
        disabled={api.disabled}
        onIonInput={(e) => onChange(e.detail.value ?? '')}
        onIonBlur={api.blur}
      />
      {error ? <p className="core-form-error">{error}</p> : null}
    </div>
  );
}

function FileControl({
  api,
  accept,
  multiple,
}: {
  api: ControlApi;
  accept?: string[];
  multiple: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files: FileRef[] = multiple
    ? Array.isArray(api.value)
      ? (api.value as FileRef[])
      : []
    : api.value
      ? [api.value as FileRef]
      : [];

  const onPick = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        Array.from(list).map((f) => uploadFormFile(f)),
      );
      api.set(multiple ? [...files, ...uploaded] : uploaded[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir el archivo');
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (i: number) =>
    api.set(multiple ? files.filter((_, idx) => idx !== i) : null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {files.length > 0 ? (
        <div className="core-form-files">
          {files.map((f, i) => (
            <div key={f.id ?? i} className="core-form-file">
              <span>{f.name ?? f.id}</span>
              <button
                type="button"
                aria-label="Quitar archivo"
                disabled={api.disabled}
                onClick={() => removeAt(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--core-muted)',
                }}
              >
                <IonIcon icon={closeOutline} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        accept={accept?.join(',')}
        multiple={multiple}
        disabled={api.disabled || busy}
        onChange={(e) => {
          void onPick(e.target.files);
          e.target.value = '';
        }}
      />
      <IonButton
        fill="outline"
        size="small"
        disabled={api.disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <IonIcon slot="start" icon={cloudUploadOutline} />
        {busy ? 'Subiendo…' : multiple ? 'Añadir archivo' : 'Subir archivo'}
      </IonButton>
      {error ? <p className="core-form-error">{error}</p> : null}
    </div>
  );
}

function SignatureControl({ api }: { api: ControlApi }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasValue = api.value != null;

  const at = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (api.disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const p = at(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = at(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const url = canvasRef.current?.toDataURL('image/png');
    if (url) api.set({ url, name: 'signature.png', mimeType: 'image/png' });
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    api.set(null);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={150}
        className="core-form-signature"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <IonButton
        fill="clear"
        size="small"
        disabled={api.disabled || !hasValue}
        onClick={clear}
      >
        <IonIcon slot="start" icon={trashOutline} />
        Borrar firma
      </IonButton>
    </div>
  );
}

function flattenTree(
  options: TreeOption[],
  depth = 0,
): { opt: TreeOption; depth: number }[] {
  const out: { opt: TreeOption; depth: number }[] = [];
  for (const opt of options) {
    out.push({ opt, depth });
    if (opt.children?.length) out.push(...flattenTree(opt.children, depth + 1));
  }
  return out;
}

function TreeSelectControl({
  api,
  options,
  multiple,
}: {
  api: ControlApi;
  options: TreeOption[];
  multiple: boolean;
}) {
  const rows = flattenTree(options);
  if (multiple) {
    const selected = Array.isArray(api.value) ? (api.value as string[]) : [];
    const toggle = (v: string, checked: boolean) =>
      api.set(checked ? [...selected, v] : selected.filter((x) => x !== v));
    return (
      <div className="core-form-options">
        {rows.map(({ opt, depth }) => (
          <label
            key={opt.value}
            className="core-form-option"
            style={{ paddingInlineStart: depth * 16 }}
          >
            <IonCheckbox
              checked={selected.includes(opt.value)}
              disabled={api.disabled || opt.disabled}
              onIonChange={(e) => toggle(opt.value, e.detail.checked)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }
  return (
    <IonRadioGroup
      value={(api.value as string) ?? ''}
      onIonChange={(e) => api.set(e.detail.value)}
    >
      <div className="core-form-options">
        {rows.map(({ opt, depth }) => (
          <label
            key={opt.value}
            className="core-form-option"
            style={{ paddingInlineStart: depth * 16 }}
          >
            <IonRadio
              value={opt.value}
              disabled={api.disabled || opt.disabled}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </IonRadioGroup>
  );
}

function CascaderControl({
  api,
  options,
}: {
  api: ControlApi;
  options: TreeOption[];
}) {
  const path = Array.isArray(api.value) ? (api.value as string[]) : [];
  const levels: TreeOption[][] = [options];
  let current = options;
  for (const val of path) {
    const found = current.find((o) => o.value === val);
    if (found?.children?.length) {
      current = found.children;
      levels.push(current);
    } else break;
  }
  const setLevel = (i: number, value: string) =>
    api.set([...path.slice(0, i), value]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {levels.map((opts, i) => (
        <IonSelect
          key={i}
          className="core-control"
          value={path[i] ?? ''}
          placeholder="Selecciona"
          disabled={api.disabled}
          interface="action-sheet"
          onIonChange={(e) => setLevel(i, e.detail.value)}
        >
          {opts.map((o) => (
            <IonSelectOption
              key={o.value}
              value={o.value}
              disabled={o.disabled}
            >
              {o.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      ))}
    </div>
  );
}

function ArrayControl({ api, field }: { api: ControlApi; field: ArrayField }) {
  const items = Array.isArray(api.value)
    ? (api.value as Record<string, unknown>[])
    : [];
  const children = collectDataFields(field.fields);
  const setItems = (next: Record<string, unknown>[]) => api.set(next);
  const canAdd = field.max == null || items.length < field.max;
  const canRemove = field.min == null || items.length > field.min;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} className="core-form-item">
          <div className="core-form-item-head">
            <span className="core-form-item-index">#{i + 1}</span>
            <IonButton
              fill="clear"
              color="danger"
              size="small"
              disabled={api.disabled || !canRemove}
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            >
              <IonIcon slot="icon-only" icon={trashOutline} />
            </IonButton>
          </div>
          {children.map((child) => {
            const label = child.label ? api.t(child.label) : child.name;
            const childApi: ControlApi = {
              value: item[child.name],
              disabled: api.disabled,
              placeholder: child.placeholder
                ? api.t(child.placeholder)
                : undefined,
              hasError: false,
              set: (v) =>
                setItems(
                  items.map((it, idx) =>
                    idx === i ? { ...it, [child.name]: v } : it,
                  ),
                ),
              blur: () => {},
              t: api.t,
            };
            return (
              <FieldWrapper key={child.name} label={label}>
                {renderControl(child, childApi)}
              </FieldWrapper>
            );
          })}
        </div>
      ))}
      <IonButton
        fill="outline"
        size="small"
        disabled={api.disabled || !canAdd}
        onClick={() => setItems([...items, {}])}
      >
        <IonIcon slot="start" icon={addOutline} />
        Añadir
      </IonButton>
    </div>
  );
}
