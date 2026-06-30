import {
  AlertTriangle,
  Files,
  FileText,
  Globe,
  Shield,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary, type KpiItem } from './hooks/use-dashboard-summary';

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  'users.total': Users,
  'users.active': UserCheck,
  'roles.total': Shield,
  'files.total': Files,
  'blog.posts.published': Globe,
  'blog.posts.draft': FileText,
};

function formatValue(item: KpiItem): string {
  return item.value.toLocaleString('es-ES');
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = ICON_BY_SLUG[item.slug] ?? Users;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {item.label}
          </CardTitle>
          <Icon className="text-muted-foreground size-4 shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{formatValue(item)}</p>
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-4 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-20" />
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Resumen del sistema" />

      {isError && (
        <div className="text-destructive flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Error al cargar los datos.{' '}
            <button
              onClick={() => refetch()}
              className="underline underline-offset-2"
            >
              Reintentar
            </button>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : data?.kpis.map((kpi) => <KpiCard key={kpi.slug} item={kpi} />)}
      </div>
    </div>
  );
}
