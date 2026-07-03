import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidKey, typeHasOptions } from '../schema';
import type { FormFieldOption, FormFieldSchema } from '../types';

interface FieldEditorPanelProps {
  field: FormFieldSchema | null;
  /** Otras keys del formulario, para detectar colisiones. */
  siblingKeys: string[];
  onChange: (field: FormFieldSchema) => void;
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export function FieldEditorPanel({
  field,
  siblingKeys,
  onChange,
}: FieldEditorPanelProps) {
  if (!field) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
        Selecciona un campo para editarlo.
      </div>
    );
  }

  const update = (patch: Partial<FormFieldSchema>) =>
    onChange({ ...field, ...patch });

  const keyTaken = siblingKeys.includes(field.key);
  const keyError = !isValidKey(field.key)
    ? 'La key no puede estar vacía ni tener espacios.'
    : keyTaken
      ? 'Ya existe otro campo con esta key.'
      : null;

  const isText =
    field.type === 'text' ||
    field.type === 'textarea' ||
    field.type === 'email';

  const updateOption = (index: number, patch: Partial<FormFieldOption>) => {
    const options = [...(field.options ?? [])];
    options[index] = { ...options[index], ...patch };
    update({ options });
  };
  const addOption = () => {
    const options = [...(field.options ?? [])];
    options.push({
      value: `opcion_${options.length + 1}`,
      label: `Opción ${options.length + 1}`,
    });
    update({ options });
  };
  const removeOption = (index: number) => {
    const options = (field.options ?? []).filter((_, i) => i !== index);
    update({ options });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="field-key">Key</Label>
        <Input
          id="field-key"
          value={field.key}
          className="font-mono"
          aria-invalid={Boolean(keyError)}
          onChange={(e) => update({ key: e.target.value })}
        />
        {keyError && <p className="text-destructive text-xs">{keyError}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="field-label">Etiqueta</Label>
        <Input
          id="field-label"
          value={field.label ?? ''}
          onChange={(e) => update({ label: e.target.value })}
        />
      </div>

      {field.type !== 'checkbox' && (
        <div className="grid gap-2">
          <Label htmlFor="field-placeholder">Placeholder</Label>
          <Input
            id="field-placeholder"
            value={field.placeholder ?? ''}
            onChange={(e) =>
              update({ placeholder: e.target.value || undefined })
            }
          />
        </div>
      )}

      {field.type === 'checkbox' && (
        <div className="grid gap-2">
          <Label htmlFor="field-checkbox-text">Texto junto a la casilla</Label>
          <Input
            id="field-checkbox-text"
            value={field.placeholder ?? ''}
            onChange={(e) =>
              update({ placeholder: e.target.value || undefined })
            }
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="field-help">Texto de ayuda</Label>
        <Input
          id="field-help"
          value={field.helpText ?? ''}
          onChange={(e) => update({ helpText: e.target.value || undefined })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="field-required"
          checked={Boolean(field.required)}
          onCheckedChange={(v) => update({ required: v === true })}
        />
        <Label htmlFor="field-required" className="font-normal">
          Campo obligatorio
        </Label>
      </div>

      {field.type === 'textarea' && (
        <div className="grid gap-2">
          <Label htmlFor="field-rows">Filas</Label>
          <Input
            id="field-rows"
            type="number"
            min={1}
            value={field.rows ?? ''}
            onChange={(e) => update({ rows: numberOrUndefined(e.target.value) })}
          />
        </div>
      )}

      {isText && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="field-minlen">Longitud mín.</Label>
            <Input
              id="field-minlen"
              type="number"
              min={0}
              value={field.minLength ?? ''}
              onChange={(e) =>
                update({ minLength: numberOrUndefined(e.target.value) })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="field-maxlen">Longitud máx.</Label>
            <Input
              id="field-maxlen"
              type="number"
              min={0}
              value={field.maxLength ?? ''}
              onChange={(e) =>
                update({ maxLength: numberOrUndefined(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {field.type === 'number' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="field-min">Mínimo</Label>
            <Input
              id="field-min"
              type="number"
              value={field.min ?? ''}
              onChange={(e) =>
                update({ min: numberOrUndefined(e.target.value) })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="field-max">Máximo</Label>
            <Input
              id="field-max"
              type="number"
              value={field.max ?? ''}
              onChange={(e) =>
                update({ max: numberOrUndefined(e.target.value) })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="field-step">Paso</Label>
            <Input
              id="field-step"
              type="number"
              value={field.step ?? ''}
              onChange={(e) =>
                update({ step: numberOrUndefined(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {isText && (
        <div className="grid gap-2">
          <Label htmlFor="field-pattern">Patrón (regex)</Label>
          <Input
            id="field-pattern"
            value={field.pattern ?? ''}
            className="font-mono"
            placeholder="p. ej. ^[0-9]{9}$"
            onChange={(e) => update({ pattern: e.target.value || undefined })}
          />
        </div>
      )}

      {typeHasOptions(field.type) && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Opciones</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addOption}>
              <Plus size={14} />
              Añadir
            </Button>
          </div>
          <div className="space-y-2">
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label="Valor"
                  className="font-mono"
                  placeholder="valor"
                  value={opt.value}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                />
                <Input
                  aria-label="Etiqueta"
                  placeholder="Etiqueta"
                  value={opt.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8 shrink-0"
                  title="Quitar opción"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {(field.options ?? []).length === 0 && (
              <p className="text-muted-foreground text-xs">
                Sin opciones. Añade al menos una.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
