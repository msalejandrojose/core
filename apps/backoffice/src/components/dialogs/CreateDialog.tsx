import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CreateDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  isPending?: boolean;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog genérico para crear/editar recursos. El formulario vive como `children`
 * (fuera del dialog) y el submit se dispara con la prop `onSubmit`, de modo que
 * el dialog solo controla apertura y estado `isPending` del botón.
 */
export function CreateDialog({
  trigger,
  title,
  description,
  children,
  onSubmit,
  isPending,
  submitLabel = 'Crear',
  open,
  onOpenChange,
}: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Guardando…' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
