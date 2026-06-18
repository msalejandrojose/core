import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSectionLabel } from '@/i18n/use-section-label';
import { useSectionTree } from '@/features/sections/hooks/use-section-tree';
import {
  findActiveTop,
  firstRoute,
  routeMatches,
  sortByOrder,
} from '@/features/sections/nav';

interface Crumb {
  label: string;
  to?: string;
}

/**
 * Breadcrumbs derivados del árbol de secciones y la ruta actual:
 * `Sección / Subsección [/ Detalle]`. No se renderiza en pantallas de primer
 * nivel (cuando solo habría un nivel), para no duplicar las pestañas.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { data: tree } = useSectionTree();
  const sectionLabel = useSectionLabel();
  const sections = tree ?? [];
  const top = findActiveTop(sections, pathname);
  if (!top) return null;

  const crumbs: Crumb[] = [
    { label: sectionLabel(top.code, top.name), to: firstRoute(top) },
  ];

  const child = sortByOrder(top.children).find((c) =>
    routeMatches(pathname, c.route),
  );
  if (child) {
    crumbs.push({ label: sectionLabel(child.code, child.name), to: child.route });
  }

  // ¿Ruta de detalle? (un segmento extra tras la ruta del listado.)
  const listRoute = child?.route ?? firstRoute(top);
  if (
    listRoute &&
    pathname !== listRoute &&
    pathname.startsWith(`${listRoute}/`)
  ) {
    crumbs.push({ label: 'Detalle' });
  }

  if (crumbs.length <= 1) return null;

  return (
    <div className="bg-card border-b px-6 py-2">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center gap-1.5 text-sm"
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="opacity-50" />}
              {c.to && !isLast ? (
                <Link to={c.to} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-foreground font-medium' : ''}>
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
