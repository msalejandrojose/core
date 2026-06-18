import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useSectionTree } from '@/features/sections/hooks/use-section-tree';
import { findActiveTop } from '@/features/sections/nav';
import { Breadcrumbs } from './Breadcrumbs';
import { PrimaryTabs } from './PrimaryTabs';
import { SectionSubnav } from './SectionSubnav';
import { UserMenu } from './UserMenu';

/**
 * Cabecera con navegación en pestañas (en vez de sidebar lateral). La fila
 * superior tiene marca + pestañas de primer nivel + menú de usuario; debajo, la
 * subnavegación de la sección activa con sus secciones hijas.
 */
export function AppHeader() {
  const { pathname } = useLocation();
  const { data: tree, isLoading } = useSectionTree();
  const sections = tree ?? [];
  const activeTop = findActiveTop(sections, pathname);

  return (
    <header className="bg-card/80 supports-[backdrop-filter]:bg-card/65 sticky top-0 z-30 backdrop-blur">
      <div className="flex h-14 items-center gap-6 border-b px-6">
        <Link
          to="/"
          className="flex items-center gap-2 whitespace-nowrap"
          aria-label="Core Backoffice — inicio"
        >
          <span className="bg-primary size-2.5 rounded-full" />
          <span className="font-semibold tracking-tight">
            Core <span className="text-muted-foreground font-normal">BO</span>
          </span>
        </Link>
        {isLoading ? (
          <div className="flex flex-1 items-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-20" />
            ))}
          </div>
        ) : (
          <PrimaryTabs tree={sections} activeId={activeTop?.id} />
        )}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
      {activeTop && <SectionSubnav section={activeTop} />}
      <Breadcrumbs />
    </header>
  );
}
