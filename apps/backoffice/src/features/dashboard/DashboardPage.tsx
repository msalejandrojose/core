import {
  ArrowRight,
  Files,
  Newspaper,
  Shield,
  SquareStack,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { KpiChart } from './components/KpiChart';
import { RangeSelector } from './components/RangeSelector';
import { useDashboardStats } from './hooks/use-dashboard-stats';
import {
  getRangeFromPreset,
  RANGE_PRESETS,
  type RangePreset,
} from './hooks/use-kpi-series';

interface StatCard {
  label: string;
  value: number;
  sub?: string;
  icon: LucideIcon;
  to: string;
}

const QUICK_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/users', label: 'Usuarios', icon: Users },
  { to: '/roles', label: 'Roles', icon: Shield },
  { to: '/sections', label: 'Secciones API', icon: SquareStack },
  { to: '/blog/posts', label: 'Blog', icon: Newspaper },
  { to: '/files', label: 'Ficheros', icon: Files },
];

const CHART_KPIS = [
  { slug: 'users.total', label: 'Nuevos usuarios', type: 'bar' as const },
  { slug: 'blog.posts.published', label: 'Posts publicados', type: 'line' as const },
  { slug: 'files.total', label: 'Ficheros subidos', type: 'bar' as const },
];

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardStats();
  const [preset, setPreset] = useState<RangePreset>(RANGE_PRESETS[1]!);
  const range = getRangeFromPreset(preset);

  const cards: StatCard[] = data
    ? [
        {
          label: 'Usuarios',
          value: data.users.total,
          sub: `${data.users.active} activos`,
          icon: Users,
          to: '/users',
        },
        {
          label: 'Roles',
          value: data.roles.total,
          icon: Shield,
          to: '/roles',
        },
        {
          label: 'Secciones API',
          value: data.apiSections.total,
          icon: SquareStack,
          to: '/sections',
        },
        {
          label: 'Posts',
          value: data.blog.posts,
          sub: `${data.blog.published} publicados`,
          icon: Newspaper,
          to: '/blog/posts',
        },
        {
          label: 'Ficheros',
          value: data.files.total,
          icon: Files,
          to: '/files',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Resumen del sistema." />

      {isError ? (
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">
            No se pudieron cargar las métricas. Inténtalo de nuevo más tarde.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
            : cards.map((card) => <StatCardView key={card.label} card={card} />)}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-base font-medium">Evolución temporal</h2>
          <RangeSelector value={preset} onChange={setPreset} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {CHART_KPIS.map((kpi) => (
            <KpiChart
              key={kpi.slug}
              slug={kpi.slug}
              label={kpi.label}
              type={kpi.type}
              from={range.from}
              to={range.to}
              granularity={preset.granularity}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-foreground text-base font-medium">Accesos directos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <QuickLink key={link.to} {...link} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCardView({ card }: { card: StatCard }) {
  const Icon = card.icon;
  return (
    <Link to={card.to} className="group">
      <Card className="gap-2 py-5 transition-colors group-hover:border-foreground/20">
        <div className="flex items-center justify-between px-6">
          <span className="text-muted-foreground text-sm">{card.label}</span>
          <Icon className="text-muted-foreground size-4" />
        </div>
        <div className="px-6">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {card.value.toLocaleString('es-ES')}
          </p>
          {card.sub && (
            <p className="text-muted-foreground mt-1 text-xs">{card.sub}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

function StatSkeleton() {
  return (
    <Card className="gap-2 py-5">
      <div className="flex items-center justify-between px-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="size-4 rounded" />
      </div>
      <div className="px-6">
        <Skeleton className="h-8 w-16" />
      </div>
    </Card>
  );
}

function QuickLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link to={to} className="group">
      <Card
        className={cn(
          'flex-row items-center justify-between gap-3 px-4 py-4',
          'transition-colors group-hover:border-foreground/20',
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">{label}</span>
        </span>
        <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
      </Card>
    </Link>
  );
}
