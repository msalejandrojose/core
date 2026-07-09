import { Controller, useFormContext } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type FieldDescriptor } from '../types';
import {
  secretPlaceholder,
  type FieldErrors,
} from '../lib/dynamic-fields';

interface DynamicFieldsProps {
  /** Raíz del nombre en el form (los campos quedan en `${prefix}.${key}`). */
  prefix: 'config' | 'content';
  descriptors: FieldDescriptor[];
  /** Errores de validación client-side, indexados por `key` del descriptor. */
  errors: FieldErrors;
  /** Config/content ya guardado (para saber si un secreto tiene valor previo). */
  existing?: Record<string, unknown>;
}

/**
 * Renderiza un formulario a partir de un array de `FieldDescriptor` (el
 * `configSchema` de un tipo de cuenta o el `messageSchema` de una cuenta). No
 * conoce el canal: pinta el input según `type`, respeta `required`/`options` y
 * enmascara los `secret` (nunca muestra el valor guardado). Se apoya en el
 * `FormProvider` del diálogo contenedor (`useFormContext`).
 */
export function DynamicFields({
  prefix,
  descriptors,
  errors,
  existing,
}: DynamicFieldsProps) {
  const { control } = useFormContext();

  if (descriptors.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Este canal no requiere configuración adicional.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {descriptors.map((d) => {
        const name = `${prefix}.${d.key}`;
        const error = errors[d.key];
        return (
          <div key={d.key} className="space-y-1.5">
            <Label htmlFor={name}>
              {d.label}
              {d.required && <span className="text-destructive"> *</span>}
              {d.secret && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  (secreto)
                </span>
              )}
            </Label>
            <Controller
              control={control}
              name={name}
              render={({ field }) => (
                <FieldInput
                  id={name}
                  descriptor={d}
                  value={field.value}
                  onChange={field.onChange}
                  existing={existing}
                />
              )}
            />
            {d.help && (
              <p className="text-muted-foreground text-xs">{d.help}</p>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}

interface FieldInputProps {
  id: string;
  descriptor: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  existing?: Record<string, unknown>;
}

function FieldInput({
  id,
  descriptor: d,
  value,
  onChange,
  existing,
}: FieldInputProps) {
  const str = typeof value === 'string' ? value : '';

  switch (d.type) {
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={value === true}
            onCheckedChange={(c) => onChange(c === true)}
          />
          <span className="text-muted-foreground text-sm">
            {value === true ? 'Sí' : 'No'}
          </span>
        </div>
      );
    case 'select':
      return (
        <Select value={str} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Selecciona…" />
          </SelectTrigger>
          <SelectContent>
            {(d.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'textarea':
    case 'template':
      return (
        <Textarea
          id={id}
          rows={d.type === 'template' ? 6 : 3}
          className={d.type === 'template' ? 'font-mono text-xs' : undefined}
          placeholder={d.type === 'template' ? '{ … }  (JSON)' : undefined}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'email':
    case 'text':
    default:
      return (
        <Input
          id={id}
          type={d.type === 'email' ? 'email' : 'text'}
          value={str}
          placeholder={
            d.secret
              ? secretPlaceholder(existing?.[d.key] != null)
              : undefined
          }
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
