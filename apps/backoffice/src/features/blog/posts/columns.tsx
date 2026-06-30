import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import type { PostRow } from '../types';
import { PostStatusBadge } from './components/PostStatusBadge';
import { useDeletePost } from './hooks/use-delete-post';

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
  const remove = useDeletePost();

  return (
    <RowActions
      editHref={`/blog/posts/${post.id}`}
      onDelete={() => remove.mutate(post.id)}
      deleteTitle="¿Eliminar post?"
      deleteDescription="El post se borra de forma permanente. Esta acción no se puede deshacer."
      isDeleting={remove.isPending}
    />
  );
}
