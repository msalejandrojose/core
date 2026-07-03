import {
  isFieldEnabled,
  isFieldVisible,
  type DataField,
  type Field,
  type FormSchema,
} from '@core/forms';
import {
  Controller,
  useWatch,
  type Control,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
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
            {field.options.map((opt) => (
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
          {field.options.map((opt) => {
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
          {field.options.map((opt) => {
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
    default:
      // Tipo sin componente en el renderer v1 (checkbox, toggle, multiselect…).
      // Forward-compatible: avisamos en dev y no renderizamos nada.
      if (import.meta.env.DEV) {
        console.warn(
          `[forms] tipo de campo no soportado por el renderer v1: "${field.type}"`,
        );
      }
      return <></>;
  }
}
