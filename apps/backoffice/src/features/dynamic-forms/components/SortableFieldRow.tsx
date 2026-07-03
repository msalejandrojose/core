import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fieldTypeLabel } from '../schema';
import type { FormFieldSchema } from '../types';

interface SortableFieldRowProps {
  field: FormFieldSchema;
  selected: boolean;
  invalid: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SortableFieldRow({
  field,
  selected,
  invalid,
  onSelect,
  onDuplicate,
  onDelete,
}: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-sm',
        selected && 'border-primary ring-primary/20 ring-2',
        invalid && !selected && 'border-destructive',
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
        aria-label="Reordenar campo"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate font-medium">
          {field.label?.trim() || field.key}
        </span>
        <span className="text-muted-foreground text-xs">
          {fieldTypeLabel(field.type)}
          {field.required ? ' · obligatorio' : ''}
          {invalid ? ' · key inválida' : ''}
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        title="Duplicar"
        onClick={onDuplicate}
      >
        <Copy size={14} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive size-8"
        title="Eliminar"
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
