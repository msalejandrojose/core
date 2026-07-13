import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { resolveFileUrl } from '@/lib/file-url';
import { useApproveHostVerification, useRejectHostVerification } from './hooks/use-host-verification-mutations';
import { HostVerificationStatusBadge } from './components/HostVerificationStatusBadge';
import type { HostVerificationRow } from './types';

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' });

function ReviewActions({ verification }: { verification: HostVerificationRow }) {
  const approve = useApproveHostVerification();
  const reject = useRejectHostVerification();

  if (verification.status !== 'PENDING') return null;

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        className="text-primary size-8"
        title="Aprobar"
        disabled={approve.isPending}
        onClick={() => approve.mutate(verification.id)}
      >
        <Check size={14} />
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" className="text-destructive size-8" title="Rechazar">
            <X size={14} />
          </Button>
        }
        title="¿Rechazar esta verificación?"
        description="El host podrá volver a enviar la solicitud."
        destructiveLabel="Rechazar"
        isPending={reject.isPending}
        onConfirm={() => reject.mutate({ id: verification.id })}
      />
    </div>
  );
}

export const hostVerificationColumns: ColumnDef<HostVerificationRow>[] = [
  {
    accessorKey: 'legalName',
    header: 'Nombre legal',
    cell: ({ row }) => <span className="font-medium">{row.original.legalName}</span>,
  },
  {
    accessorKey: 'documentFileId',
    header: 'Documento',
    cell: ({ row }) => (
      <a
        href={resolveFileUrl(row.original.documentUrl)}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground hover:underline"
      >
        Ver documento
      </a>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <HostVerificationStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Enviada',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => <ReviewActions verification={row.original} />,
  },
];
