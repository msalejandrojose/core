import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteApiSection } from './hooks/use-delete-api-section';
import type { ApiSectionRow } from './types';

export const columns: ColumnDef<ApiSectionRow>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <Link
        to={`/sections/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.description ?? '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ApiSectionRowActions id={row.original.id} />,
  },
];

function ApiSectionRowActions({ id }: { id: string }) {
  const { mutate: deleteSection, isPending } = useDeleteApiSection();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/sections/${id}`}>Ver detalle</Link>
        </DropdownMenuItem>
        <ConfirmDialog
          trigger={
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              Eliminar
            </DropdownMenuItem>
          }
          title="¿Eliminar sección?"
          description="Solo se puede eliminar si ningún rol o usuario tiene permisos sobre ella."
          onConfirm={() => deleteSection(id)}
          isPending={isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
