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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <CategoryFormDialog
          category={category}
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
          title="¿Eliminar categoría?"
          description="Los posts que la usaban quedarán sin categoría. No se puede deshacer."
          onConfirm={() => remove.mutate(category.id)}
          isPending={remove.isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
