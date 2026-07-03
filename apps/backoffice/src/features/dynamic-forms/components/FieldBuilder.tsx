import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FIELD_TYPES, duplicateKeys, isValidKey, makeField, nextFieldKey } from '../schema';
import type { FormFieldSchema, FormFieldType } from '../types';
import { SortableFieldRow } from './SortableFieldRow';

interface FieldBuilderProps {
  fields: FormFieldSchema[];
  onChange: (fields: FormFieldSchema[]) => void;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  disabled?: boolean;
}

export function FieldBuilder({
  fields,
  onChange,
  selectedKey,
  onSelect,
  disabled,
}: FieldBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dups = duplicateKeys(fields);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.key === active.id);
    const to = fields.findIndex((f) => f.key === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(fields, from, to));
  };

  const addField = (type: FormFieldType) => {
    const field = makeField(type, fields);
    onChange([...fields, field]);
    onSelect(field.key);
  };

  const duplicateField = (index: number) => {
    const original = fields[index];
    const copy: FormFieldSchema = {
      ...original,
      key: nextFieldKey(fields),
      label: original.label ? `${original.label} (copia)` : original.label,
      options: original.options?.map((o) => ({ ...o })),
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    onChange(next);
    onSelect(copy.key);
  };

  const deleteField = (index: number) => {
    const removed = fields[index];
    onChange(fields.filter((_, i) => i !== index));
    if (selectedKey === removed.key) onSelect(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Campos</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={disabled}>
              <Plus size={14} />
              Añadir campo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tipo de campo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FIELD_TYPES.map((t) => (
              <DropdownMenuItem key={t.type} onClick={() => addField(t.type)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {fields.length === 0 ? (
        <div className="border-muted-foreground/25 text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
          Aún no hay campos. Añade el primero con «Añadir campo».
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field, index) => (
                <SortableFieldRow
                  key={field.key}
                  field={field}
                  selected={selectedKey === field.key}
                  invalid={!isValidKey(field.key) || dups.has(field.key)}
                  onSelect={() => onSelect(field.key)}
                  onDuplicate={() => duplicateField(index)}
                  onDelete={() => deleteField(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
