import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
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
    <RowActions
      onDelete={() => remove.mutate(file.id)}
      deleteTitle="¿Eliminar fichero?"
      deleteDescription="El fichero se borra (lógicamente) y dejará de estar disponible."
      isDeleting={remove.isPending}
      extra={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Descargar"
          disabled={download.isPending}
          onClick={() => download.mutate({ id: file.id, filename: file.originalName })}
        >
          <Download size={14} />
        </Button>
      }
    />
  );
}
