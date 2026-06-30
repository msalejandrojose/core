import { Eye, Pencil, Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';

interface RowActionsProps {
  viewHref?: string;
  editHref?: string;
  editState?: Record<string, unknown>;
  onDelete?: () => void;
  deleteTitle?: string;
  deleteDescription?: string;
  isDeleting?: boolean;
  extra?: ReactNode;
}

export function RowActions({
  viewHref,
  editHref,
  editState,
  onDelete,
  deleteTitle = '¿Eliminar?',
  deleteDescription = 'Esta acción no se puede deshacer.',
  isDeleting,
  extra,
}: RowActionsProps) {
  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {extra}
      {viewHref && (
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to={viewHref} state={undefined} title="Ver detalle">
            <Eye size={14} />
          </Link>
        </Button>
      )}
      {editHref && (
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to={editHref} state={editState} title="Editar">
            <Pencil size={14} />
          </Link>
        </Button>
      )}
      {onDelete && (
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </Button>
          }
          title={deleteTitle}
          description={deleteDescription}
          onConfirm={onDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
