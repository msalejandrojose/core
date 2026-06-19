import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { POST_STATUSES, type PostRow, type PostStatus } from '../types';
import { columns } from './columns';
import { usePosts } from './hooks/use-posts';

type StatusFilter = 'all' | PostStatus;

const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

export function PostsPage() {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  // Pila de cursores: el primero es `undefined` (primera página) y el último es
  // el cursor de la página visible. Mismo patrón que Usuarios (BO-06).
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = usePosts({
    limit,
    cursor: currentCursor,
    titleContains: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
  });

  const rows: PostRow[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts"
        description="Crea y publica las noticias del blog."
        actions={
          <Button asChild>
            <Link to="/blog/posts/new">Nuevo post</Link>
          </Button>
        }
      />
      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        pagination={{
          mode: 'cursor',
          limit,
          hasMore: data?.meta.hasMore ?? false,
          hasPrevious: cursors.length > 1,
          onNext: () => {
            const next = data?.meta.nextCursor;
            if (next) setCursors((s) => [...s, next]);
          },
          onPrevious: () =>
            setCursors((s) => (s.length > 1 ? s.slice(0, -1) : s)),
          onLimitChange: (l) => {
            setLimit(l);
            resetPaging();
          },
        }}
        onSearch={(v) => {
          setSearch(v);
          resetPaging();
        }}
        searchPlaceholder="Buscar por título…"
        emptyMessage="No hay posts"
        toolbar={
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as StatusFilter);
              resetPaging();
            }}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {POST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
