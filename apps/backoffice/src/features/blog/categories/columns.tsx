import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RowActions } from '@/components/data-table/RowActions';
import type { CategoryRow } from '../types';
import { CategoryFormDialog } from './components/CategoryFormDialog';
import { useDeleteCategory } from './hooks/use-delete-category';

export const columns: ColumnDef<CategoryRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.slug}</span>
    ),
  },
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
    cell: ({ row }) => <CategoryRowActions category={row.original} />,
  },
];

function CategoryRowActions({ category }: { category: CategoryRow }) {
  const remove = useDeleteCategory();
  return (
    <RowActions
      onDelete={() => remove.mutate(category.id)}
      deleteTitle="¿Eliminar categoría?"
      deleteDescription="Los posts que la usaban quedarán sin categoría. No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <CategoryFormDialog
          category={category}
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
