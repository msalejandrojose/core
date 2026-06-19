import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TagRow } from '../types';
import { TagFormDialog } from './components/TagFormDialog';
import { useDeleteTag } from './hooks/use-delete-tag';

export const columns: ColumnDef<TagRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.slug}</span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <TagRowActions tag={row.original} />,
  },
];

function TagRowActions({ tag }: { tag: TagRow }) {
  const remove = useDeleteTag();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <TagFormDialog
          tag={tag}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Editar
            </DropdownMenuItem>
          }
        />
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
          title="¿Eliminar etiqueta?"
          description="Se quitará de los posts que la usaban. No se puede deshacer."
          onConfirm={() => remove.mutate(tag.id)}
          isPending={remove.isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
