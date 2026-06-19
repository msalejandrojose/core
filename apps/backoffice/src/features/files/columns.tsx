import type { ColumnDef } from '@tanstack/react-table';
import { Download, MoreHorizontal } from 'lucide-react';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes } from './lib/format';
import { useDeleteFile } from './hooks/use-delete-file';
import { useDownloadFile } from './hooks/use-download-file';
import type { StoredFile } from './types';

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' });

export const columns: ColumnDef<StoredFile>[] = [
  {
    accessorKey: 'originalName',
    header: 'Nombre',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.originalName}</span>
    ),
  },
  {
    accessorKey: 'mimeType',
    header: 'Tipo',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.original.mimeType}
      </span>
    ),
  },
  {
    accessorKey: 'sizeBytes',
    header: 'Tamaño',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatBytes(row.original.sizeBytes)}</span>
    ),
  },
  {
    accessorKey: 'driver',
    header: 'Driver',
    cell: ({ row }) => (
      <Badge variant="outline" className="uppercase">
        {row.original.driver}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Subido',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <FileRowActions file={row.original} />,
  },
];

function FileRowActions({ file }: { file: StoredFile }) {
  const download = useDownloadFile();
  const remove = useDeleteFile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            download.mutate({ id: file.id, filename: file.originalName })
          }
        >
          <Download size={14} />
          Descargar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              Eliminar
            </DropdownMenuItem>
          }
          title="¿Eliminar fichero?"
          description="El fichero se borra (lógicamente) y dejará de estar disponible."
          onConfirm={() => remove.mutate(file.id)}
          isPending={remove.isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
