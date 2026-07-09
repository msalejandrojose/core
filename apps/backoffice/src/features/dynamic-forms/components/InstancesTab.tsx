import { Check, Copy, DoorClosed, DoorOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateInstanceDialog } from './CreateInstanceDialog';
import { useDeleteFormInstance } from '../hooks/use-delete-form-instance';
import { useFormInstances } from '../hooks/use-form-instances';
import { useUpdateFormInstance } from '../hooks/use-update-form-instance';
import {
  INSTANCE_STATUS_LABELS,
  RESPONSE_POLICY_LABELS,
  type FormInstanceDto,
} from '../types';

function publicUrl(hash: string): string {
  const base = import.meta.env.VITE_PUBLIC_FORMS_URL ?? window.location.origin;
  return `${base.replace(/\/$/, '')}/forms?f=${encodeURIComponent(hash)}`;
}

export function InstancesTab({ formId }: { formId: string }) {
  const { data, isLoading } = useFormInstances(formId);
  const instances = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Cada enlace es una instancia pública con su propia política y ventana.
        </p>
        <CreateInstanceDialog formId={formId} />
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : instances.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
          Aún no hay enlaces. Crea el primero con «Nuevo enlace».
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Política</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enlace</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((instance) => (
                <InstanceRow
                  key={instance.id}
                  formId={formId}
                  instance={instance}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InstanceRow({
  formId,
  instance,
}: {
  formId: string;
  instance: FormInstanceDto;
}) {
  const [copied, setCopied] = useState(false);
  const update = useUpdateFormInstance(formId, instance.id);
  const remove = useDeleteFormInstance(formId);
  const url = publicUrl(instance.hash);
  const isActive = instance.status === 'ACTIVE';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  return (
    <TableRow>
      <TableCell>{RESPONSE_POLICY_LABELS[instance.responsePolicy]}</TableCell>
      <TableCell>
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {INSTANCE_STATUS_LABELS[instance.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={copy}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono text-xs"
          title="Copiar enlace"
        >
          {copied ? (
            <Check size={14} className="text-primary" />
          ) : (
            <Copy size={14} />
          )}
          <span className="max-w-[280px] truncate">{url}</span>
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ status: isActive ? 'CLOSED' : 'ACTIVE' })
            }
          >
            {isActive ? (
              <>
                <DoorClosed size={14} />
                Cerrar
              </>
            ) : (
              <>
                <DoorOpen size={14} />
                Abrir
              </>
            )}
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-8"
                title="Eliminar enlace"
              >
                <Trash2 size={14} />
              </Button>
            }
            title="¿Eliminar enlace?"
            description="Se eliminarán también las respuestas recibidas por este enlace."
            onConfirm={() => remove.mutate(instance.id)}
            isPending={remove.isPending}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
