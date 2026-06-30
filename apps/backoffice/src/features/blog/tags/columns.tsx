import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RowActions } from '@/components/data-table/RowActions';
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
    <RowActions
      onDelete={() => remove.mutate(tag.id)}
      deleteTitle="¿Eliminar etiqueta?"
      deleteDescription="Se quitará de los posts que la usaban. No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <TagFormDialog
          tag={tag}
          trigger={
            <Button variant="ghost" size="icon" className="size-8" title="Editar">
              <Pencil size={14} />
            </Button>
          }
        />
      }
    />
  );
}
