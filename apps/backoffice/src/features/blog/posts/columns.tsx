import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PostRow } from '../types';
import { PostStatusBadge } from './components/PostStatusBadge';
import { useArchivePost } from './hooks/use-archive-post';
import { useDeletePost } from './hooks/use-delete-post';
import { usePublishPost } from './hooks/use-publish-post';

const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : '—';

export const columns: ColumnDef<PostRow>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
    cell: ({ row }) => (
      <Link
        to={`/blog/posts/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <PostStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.category?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'publishedAt',
    header: 'Publicado',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt(row.original.publishedAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <PostRowActions post={row.original} />,
  },
];

function PostRowActions({ post }: { post: PostRow }) {
  const publish = usePublishPost(post.id);
  const archive = useArchivePost(post.id);
  const remove = useDeletePost();

  const isArchived = post.status === 'ARCHIVED';
  const isPublished = post.status === 'PUBLISHED';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/blog/posts/${post.id}`}>Editar</Link>
        </DropdownMenuItem>
        {!isPublished && (
          <DropdownMenuItem onSelect={() => publish.mutate({})}>
            Publicar ahora
          </DropdownMenuItem>
        )}
        {!isArchived && (
          <DropdownMenuItem onSelect={() => archive.mutate()}>
            Archivar
          </DropdownMenuItem>
        )}
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
          title="¿Eliminar post?"
          description="El post se borra de forma permanente. Esta acción no se puede deshacer."
          onConfirm={() => remove.mutate(post.id)}
          isPending={remove.isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
