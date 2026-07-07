import {
  isFieldEnabled,
  isFieldVisible,
  type AddressValue,
  type CoordinatesValue,
  type DataField,
  type DateRangeValue,
  type Field,
  type FileRef,
  type FormSchema,
  type KeyValueEntry,
} from '@core/forms';
import { Plus, Star, Upload, X } from 'lucide-react';
import { useRef, useState, type ComponentProps } from 'react';
import {
  Controller,
  useWatch,
  type Control,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';
import { uploadFormFile } from './upload';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Translate = (key: string) => string;

interface FormRendererProps<T extends FieldValues> {
  schema: FormSchema;
  control: Control<T>;
  /** Resuelve `I18nKey` → texto. Por defecto identidad (sin i18n todavía). */
  translate?: Translate;
}

/**
 * Renderer React v1 de `@core/forms`. Mapea los tipos de campo del schema a los
 * componentes shadcn + react-hook-form ya existentes en el backoffice.
 *
 * Forward-compatible: los tipos que aún no tienen componente (checkbox, toggle,
 * multiselect…) se ignoran con un aviso en dev en lugar de romper.
 *
 * Costura de extracción: cuando exista `@core/ui`, este archivo se mueve casi
 * tal cual a `packages/forms-react` sin tocar el núcleo.
 */
export function FormRenderer<T extends FieldValues>({
  schema,
  control,
  translate = (k) => k,
}: FormRendererProps<T>) {
  const values = (useWatch({ control }) ?? {}) as Record<string, unknown>;
  // Internamente trabajamos con un control "ancho": los nombres de campo del
  // schema son strings y `FieldPath<FieldValues>` ya es `string`.
  const c = control as unknown as Control<FieldValues>;

  return (
    <div className="space-y-3">
      {schema.fields.map((field, i) => (
        <RenderField
          key={fieldKey(field, i)}
          field={field}
          control={c}
          values={values}
          t={translate}
        />
      ))}
    </div>
  );
}

function fieldKey(field: Field, index: number): string {
  if ('name' in field && field.name) return field.name;
  return `${field.type}-${index}`;
}

interface RenderFieldProps {
  field: Field;
  control: Control<FieldValues>;
  values: Record<string, unknown>;
  t: Translate;
}

function RenderField({ field, control, values, t }: RenderFieldProps) {
  if (!isFieldVisible(field, values)) return null;

  switch (field.type) {
    case 'group':
      return (
        <div className={cn('grid gap-3', columnsClass(field.columns))}>
          {field.fields.map((child, i) => (
            <RenderField
              key={fieldKey(child, i)}
              field={child}
              control={control}
              values={values}
              t={t}
            />
          ))}
        </div>
      );

    case 'heading': {
      const className = 'font-medium text-foreground';
      if (field.level === 1)
        return <h2 className={cn('text-lg', className)}>{t(field.text)}</h2>;
      if (field.level === 3)
        return <h4 className={cn('text-sm', className)}>{t(field.text)}</h4>;
      return <h3 className={cn('text-base', className)}>{t(field.text)}</h3>;
    }

    case 'paragraph':
      return (
        <p className="text-muted-foreground text-sm">{t(field.text)}</p>
      );

    case 'divider':
      return <hr className="border-border" />;

    case 'hidden':
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <input type="hidden" name={f.name} value={String(f.value ?? '')} />
          )}
        />
      );

    default:
      return (
        <DataControl field={field} control={control} values={values} t={t} />
      );
  }
}

function columnsClass(columns: number | undefined): string {
  if (columns === 2) return 'grid-cols-2';
  if (columns === 3) return 'grid-cols-3';
  if (columns === 4) return 'grid-cols-4';
  return 'grid-cols-1';
}

interface DataControlProps {
  field: DataField;
  control: Control<FieldValues>;
  values: Record<string, unknown>;
  t: Translate;
}

function DataControl({ field, control, values, t }: DataControlProps) {
  const disabled = !isFieldEnabled(field, values);
  const label = field.label ? t(field.label) : '';
  const placeholder = field.placeholder ? t(field.placeholder) : undefined;

  return (
    <FieldWrapper control={control} name={field.name} label={label}>
      {(rhf) => renderControl(field, rhf, { disabled, placeholder })}
    </FieldWrapper>
  );
}

interface ControlExtras {
  disabled: boolean;
  placeholder: string | undefined;
}

function renderControl(
  field: DataField,
  rhf: ControllerRenderProps<FieldValues, string>,
  { disabled, placeholder }: ControlExtras,
) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          type="text"
          {...rhf}
          value={(rhf.value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case 'email':
      return (
        <Input
          type="email"
          autoComplete="off"
          {...rhf}
          value={(rhf.value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case 'password':
      return (
        <Input
          type="password"
          autoComplete="new-password"
          {...rhf}
          value={(rhf.value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case 'textarea':
      return (
        <Textarea
          rows={field.rows}
          {...rhf}
          value={(rhf.value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          name={rhf.name}
          ref={rhf.ref}
          onBlur={rhf.onBlur}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={placeholder}
          disabled={disabled}
          value={rhf.value == null ? '' : (rhf.value as number)}
          onChange={(e) =>
            rhf.onChange(e.target.value === '' ? null : e.target.valueAsNumber)
          }
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          {...rhf}
          value={(rhf.value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case 'select':
      return (
        <Select
          value={(rhf.value as string) ?? ''}
          onValueChange={rhf.onChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'radio':
      return (
        <RadioGroup
          value={(rhf.value as string) ?? ''}
          onValueChange={rhf.onChange}
          disabled={disabled}
        >
          {(field.options ?? []).map((opt) => {
            const id = `${rhf.name}-${opt.value}`;
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem
                  id={id}
                  value={opt.value}
                  disabled={opt.disabled}
                />
                <Label htmlFor={id} className="font-normal">
                  {opt.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={rhf.name}
            checked={Boolean(rhf.value)}
            onCheckedChange={(v) => rhf.onChange(v === true)}
            disabled={disabled}
          />
          {placeholder && (
            <Label htmlFor={rhf.name} className="font-normal">
              {placeholder}
            </Label>
          )}
        </div>
      );
    case 'multiselect': {
      const selected = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];
      const toggle = (value: string, checked: boolean) => {
        const next = checked
          ? [...selected, value]
          : selected.filter((v) => v !== value);
        rhf.onChange(next);
      };
      return (
        <div className="grid gap-2">
          {(field.options ?? []).map((opt) => {
            const id = `${rhf.name}-${opt.value}`;
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(v) => toggle(opt.value, v === true)}
                  disabled={disabled || opt.disabled}
                />
                <Label htmlFor={id} className="font-normal">
                  {opt.label}
                </Label>
              </div>
            );
          })}
        </div>
      );
    }
    // --- Texto / identificadores (input de texto simple) -----------------
    case 'url':
      return <TextInput type="url" rhf={rhf} ph={placeholder} disabled={disabled} />;
    case 'slug':
      return (
        <TextInput
          type="text"
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
          className="font-mono"
        />
      );
    case 'phone':
      return <TextInput type="tel" rhf={rhf} ph={placeholder} disabled={disabled} />;
    case 'otp':
      return (
        <TextInput
          type="text"
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
          inputMode="numeric"
          maxLength={field.length ?? 6}
          className="font-mono tracking-[0.4em]"
        />
      );
    case 'username':
    case 'country':
    case 'locale':
    case 'postalCode':
    case 'timezone':
    case 'taxId':
    case 'iban':
    case 'bankAccount':
      return <TextInput type="text" rhf={rhf} ph={placeholder} disabled={disabled} />;
    case 'creditCard':
      return (
        <TextInput
          type="text"
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
          inputMode="numeric"
          className="font-mono"
        />
      );
    case 'color':
      return (
        <Input
          type="color"
          name={rhf.name}
          ref={rhf.ref}
          onBlur={rhf.onBlur}
          value={(rhf.value as string) || '#000000'}
          disabled={disabled}
          onChange={(e) => rhf.onChange(e.target.value)}
          className="h-9 w-16 p-1"
        />
      );

    // --- Fecha / hora nativas --------------------------------------------
    case 'time':
      return <TextInput type="time" rhf={rhf} ph={placeholder} disabled={disabled} />;
    case 'datetime':
      return (
        <TextInput
          type="datetime-local"
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
        />
      );
    case 'month':
      return <TextInput type="month" rhf={rhf} ph={placeholder} disabled={disabled} />;
    case 'dateRange':
      return <DateRangeControl rhf={rhf} disabled={disabled} withTime={false} />;
    case 'dateRangeTime':
      return <DateRangeControl rhf={rhf} disabled={disabled} withTime={true} />;

    // --- Numéricos --------------------------------------------------------
    case 'currency':
      return (
        <NumberInput
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={0.01}
          suffix={field.currency ?? 'EUR'}
        />
      );
    case 'percentage':
      return (
        <NumberInput
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
          min={field.min ?? 0}
          max={field.max ?? 100}
          suffix="%"
        />
      );
    case 'year':
      return (
        <NumberInput
          rhf={rhf}
          ph={placeholder}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={1}
        />
      );
    case 'range':
      return (
        <RangeControl
          rhf={rhf}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    case 'rating':
      return <RatingControl rhf={rhf} disabled={disabled} max={field.max ?? 5} />;

    // --- Selección / boolean ---------------------------------------------
    case 'toggle':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={rhf.name}
            checked={Boolean(rhf.value)}
            onCheckedChange={(v) => rhf.onChange(v === true)}
            disabled={disabled}
          />
          {placeholder && (
            <Label htmlFor={rhf.name} className="font-normal">
              {placeholder}
            </Label>
          )}
        </div>
      );
    case 'autocomplete':
      return (
        <Select
          value={(rhf.value as string) ?? ''}
          onValueChange={rhf.onChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'tags':
      return <TagsControl rhf={rhf} disabled={disabled} ph={placeholder} />;
    case 'consent':
      return (
        <div className="flex items-start gap-2">
          <Checkbox
            id={rhf.name}
            checked={Boolean(rhf.value)}
            onCheckedChange={(v) => rhf.onChange(v === true)}
            disabled={disabled}
            className="mt-0.5"
          />
          <Label htmlFor={rhf.name} className="font-normal leading-snug">
            {field.text}
          </Label>
        </div>
      );

    // --- Compuestos -------------------------------------------------------
    case 'address':
      return <AddressControl rhf={rhf} disabled={disabled} />;
    case 'coordinates':
      return <CoordinatesControl rhf={rhf} disabled={disabled} />;
    case 'keyValue':
      return <KeyValueControl rhf={rhf} disabled={disabled} />;
    case 'json':
      return <JsonControl rhf={rhf} disabled={disabled} ph={placeholder} />;

    // --- Archivos (suben al módulo de storage → FileRef) ------------------
    case 'file':
      return (
        <FileControl
          rhf={rhf}
          disabled={disabled}
          accept={field.accept}
          multiple={field.multiple ?? false}
        />
      );
    case 'image':
      return (
        <FileControl
          rhf={rhf}
          disabled={disabled}
          accept={field.accept ?? ['image/*']}
          multiple={field.multiple ?? false}
        />
      );
    case 'avatar':
      return (
        <FileControl
          rhf={rhf}
          disabled={disabled}
          accept={['image/*']}
          multiple={false}
        />
      );

    default:
      // Tipos que aún requieren un widget dedicado (richtext, signature,
      // treeSelect, cascader, array). Forward-compatible: avisamos en dev y no
      // renderizamos nada en lugar de romper.
      if (import.meta.env.DEV) {
        console.warn(
          `[forms] tipo de campo sin renderer todavía: "${field.type}"`,
        );
      }
      return <></>;
  }
}

// --- Sub-componentes de control ---------------------------------------------

type Rhf = ControllerRenderProps<FieldValues, string>;

function TextInput({
  rhf,
  type,
  ph,
  disabled,
  className,
  inputMode,
  maxLength,
}: {
  rhf: Rhf;
  type: string;
  ph: string | undefined;
  disabled: boolean;
  className?: string;
  inputMode?: ComponentProps<'input'>['inputMode'];
  maxLength?: number;
}) {
  return (
    <Input
      type={type}
      {...rhf}
      value={(rhf.value as string) ?? ''}
      placeholder={ph}
      disabled={disabled}
      className={className}
      inputMode={inputMode}
      maxLength={maxLength}
    />
  );
}

function NumberInput({
  rhf,
  ph,
  disabled,
  min,
  max,
  step,
  suffix,
}: {
  rhf: Rhf;
  ph: string | undefined;
  disabled: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const input = (
    <Input
      type="number"
      {...rhf}
      min={min}
      max={max}
      step={step}
      placeholder={ph}
      disabled={disabled}
      value={rhf.value == null ? '' : (rhf.value as number)}
      onChange={(e) =>
        rhf.onChange(e.target.value === '' ? null : e.target.valueAsNumber)
      }
    />
  );
  if (!suffix) return input;
  return (
    <div className="flex items-center gap-2">
      {input}
      <span className="text-muted-foreground text-sm">{suffix}</span>
    </div>
  );
}

function RangeControl({
  rhf,
  disabled,
  min,
  max,
  step,
}: {
  rhf: Rhf;
  disabled: boolean;
  min: number;
  max: number;
  step?: number;
}) {
  const value = typeof rhf.value === 'number' ? rhf.value : min;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => rhf.onChange(e.target.valueAsNumber)}
        onBlur={rhf.onBlur}
        className="accent-primary w-full"
      />
      <span className="text-muted-foreground w-10 text-right text-sm tabular-nums">
        {value}
      </span>
    </div>
  );
}

function RatingControl({
  rhf,
  disabled,
  max,
}: {
  rhf: Rhf;
  disabled: boolean;
  max: number;
}) {
  const value = typeof rhf.value === 'number' ? rhf.value : 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={`${n}`}
          onClick={() => rhf.onChange(n === value ? null : n)}
          className="text-muted-foreground disabled:opacity-50"
        >
          <Star
            size={20}
            className={cn(n <= value && 'fill-amber-400 text-amber-400')}
          />
        </button>
      ))}
    </div>
  );
}

function TagsControl({
  rhf,
  disabled,
  ph,
}: {
  rhf: Rhf;
  disabled: boolean;
  ph: string | undefined;
}) {
  const tags = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && !tags.includes(t)) rhf.onChange([...tags, t]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="bg-muted flex items-center gap-1 rounded px-2 py-0.5 text-sm"
            >
              {t}
              <button
                type="button"
                disabled={disabled}
                onClick={() => rhf.onChange(tags.filter((x) => x !== t))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        placeholder={ph ?? 'Añade una etiqueta y pulsa Enter'}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={rhf.onBlur}
      />
    </div>
  );
}

function DateRangeControl({
  rhf,
  disabled,
  withTime,
}: {
  rhf: Rhf;
  disabled: boolean;
  withTime: boolean;
}) {
  const val =
    rhf.value && typeof rhf.value === 'object'
      ? (rhf.value as DateRangeValue)
      : { from: null, to: null };
  const type = withTime ? 'datetime-local' : 'date';
  const set = (patch: Partial<DateRangeValue>) => rhf.onChange({ ...val, ...patch });
  return (
    <div className="flex items-center gap-2">
      <Input
        type={type}
        value={val.from ?? ''}
        disabled={disabled}
        onChange={(e) => set({ from: e.target.value || null })}
      />
      <span className="text-muted-foreground text-sm">→</span>
      <Input
        type={type}
        value={val.to ?? ''}
        disabled={disabled}
        onChange={(e) => set({ to: e.target.value || null })}
        onBlur={rhf.onBlur}
      />
    </div>
  );
}

function AddressControl({ rhf, disabled }: { rhf: Rhf; disabled: boolean }) {
  const val =
    rhf.value && typeof rhf.value === 'object'
      ? (rhf.value as AddressValue)
      : {};
  const set = (patch: Partial<AddressValue>) => rhf.onChange({ ...val, ...patch });
  return (
    <div className="grid gap-2">
      <Input
        placeholder="Dirección"
        value={val.line1 ?? ''}
        disabled={disabled}
        onChange={(e) => set({ line1: e.target.value })}
      />
      <Input
        placeholder="Dirección (línea 2)"
        value={val.line2 ?? ''}
        disabled={disabled}
        onChange={(e) => set({ line2: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Ciudad"
          value={val.city ?? ''}
          disabled={disabled}
          onChange={(e) => set({ city: e.target.value })}
        />
        <Input
          placeholder="Provincia / Región"
          value={val.region ?? ''}
          disabled={disabled}
          onChange={(e) => set({ region: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Código postal"
          value={val.postalCode ?? ''}
          disabled={disabled}
          onChange={(e) => set({ postalCode: e.target.value })}
        />
        <Input
          placeholder="País"
          value={val.country ?? ''}
          disabled={disabled}
          onChange={(e) => set({ country: e.target.value })}
          onBlur={rhf.onBlur}
        />
      </div>
    </div>
  );
}

function CoordinatesControl({ rhf, disabled }: { rhf: Rhf; disabled: boolean }) {
  const val =
    rhf.value && typeof rhf.value === 'object'
      ? (rhf.value as CoordinatesValue)
      : null;
  const set = (patch: Partial<CoordinatesValue>) =>
    rhf.onChange({ lat: val?.lat ?? 0, lng: val?.lng ?? 0, ...patch });
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        type="number"
        step="any"
        placeholder="Latitud"
        value={val?.lat ?? ''}
        disabled={disabled}
        onChange={(e) =>
          set({ lat: e.target.value === '' ? 0 : e.target.valueAsNumber })
        }
      />
      <Input
        type="number"
        step="any"
        placeholder="Longitud"
        value={val?.lng ?? ''}
        disabled={disabled}
        onChange={(e) =>
          set({ lng: e.target.value === '' ? 0 : e.target.valueAsNumber })
        }
        onBlur={rhf.onBlur}
      />
    </div>
  );
}

function KeyValueControl({ rhf, disabled }: { rhf: Rhf; disabled: boolean }) {
  const rows = Array.isArray(rhf.value) ? (rhf.value as KeyValueEntry[]) : [];
  const update = (i: number, patch: Partial<KeyValueEntry>) =>
    rhf.onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="clave"
            className="font-mono"
            value={row.key}
            disabled={disabled}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <Input
            placeholder="valor"
            value={row.value}
            disabled={disabled}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive size-8 shrink-0"
            disabled={disabled}
            onClick={() => rhf.onChange(rows.filter((_, idx) => idx !== i))}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => rhf.onChange([...rows, { key: '', value: '' }])}
      >
        <Plus size={14} />
        Añadir
      </Button>
    </div>
  );
}

function FileControl({
  rhf,
  disabled,
  accept,
  multiple,
}: {
  rhf: Rhf;
  disabled: boolean;
  accept?: string[];
  multiple: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files: FileRef[] = multiple
    ? Array.isArray(rhf.value)
      ? (rhf.value as FileRef[])
      : []
    : rhf.value
      ? [rhf.value as FileRef]
      : [];

  const onPick = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        Array.from(list).map((f) => uploadFormFile(f)),
      );
      rhf.onChange(multiple ? [...files, ...uploaded] : uploaded[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir el archivo');
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (i: number) =>
    rhf.onChange(multiple ? files.filter((_, idx) => idx !== i) : null);

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={f.id ?? i}
              className="bg-muted flex items-center justify-between gap-2 rounded px-2 py-1 text-sm"
            >
              <span className="truncate">{f.name ?? f.id}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(i)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept?.join(',')}
        multiple={multiple}
        disabled={disabled || busy}
        onChange={(e) => {
          void onPick(e.target.files);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} />
        {busy ? 'Subiendo…' : multiple ? 'Añadir archivo' : 'Subir archivo'}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function JsonControl({
  rhf,
  disabled,
  ph,
}: {
  rhf: Rhf;
  disabled: boolean;
  ph: string | undefined;
}) {
  const [text, setText] = useState(() => {
    try {
      return rhf.value == null ? '' : JSON.stringify(rhf.value, null, 2);
    } catch {
      return '';
    }
  });
  const [error, setError] = useState<string | null>(null);
  const onChange = (v: string) => {
    setText(v);
    if (v.trim() === '') {
      setError(null);
      rhf.onChange(null);
      return;
    }
    try {
      rhf.onChange(JSON.parse(v));
      setError(null);
    } catch {
      setError('JSON no válido');
    }
  };
  return (
    <div className="space-y-1">
      <Textarea
        rows={5}
        className="font-mono text-xs"
        value={text}
        placeholder={ph ?? '{ }'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={rhf.onBlur}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
