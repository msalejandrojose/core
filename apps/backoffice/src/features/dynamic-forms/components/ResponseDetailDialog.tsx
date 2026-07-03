import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatAnswer } from '../schema';
import type { FormResponseDto } from '../types';

interface ResponseDetailDialogProps {
  response: FormResponseDto | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de una respuesta. Renderiza cada answer usando el `schemaSnapshot`
 * guardado al enviarla (no el schema actual del formulario), de modo que la
 * lectura sea fiel aunque el formulario haya cambiado después.
 */
export function ResponseDetailDialog({
  response,
  onOpenChange,
}: ResponseDetailDialogProps) {
  const fields = response?.schemaSnapshot?.fields ?? [];

  return (
    <Dialog open={Boolean(response)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de la respuesta</DialogTitle>
          {response && (
            <DialogDescription>
              {new Date(response.submittedAt).toLocaleString('es-ES', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {' · '}
              {response.submittedById ? 'Usuario autenticado' : 'Anónimo'}
            </DialogDescription>
          )}
        </DialogHeader>

        {response && (
          <dl className="divide-border divide-y">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1 py-3">
                <dt className="text-muted-foreground text-xs">
                  {field.label?.trim() || field.key}
                </dt>
                <dd className="text-sm break-words whitespace-pre-wrap">
                  {formatAnswer(field, response.answers?.[field.key])}
                </dd>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-muted-foreground py-3 text-sm">
                Esta respuesta no conserva el schema de sus campos.
              </p>
            )}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
