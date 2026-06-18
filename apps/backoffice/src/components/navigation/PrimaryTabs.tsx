import { Link } from 'react-router-dom';
import { useSectionLabel } from '@/i18n/use-section-label';
import { firstRoute, sortByOrder } from '@/features/sections/nav';
import type { SectionTreeNode } from '@/features/sections/types';
import { resolveIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * Pestañas de navegación principal en el header. Cada tab es una sección de
 * primer nivel; las de tipo grupo (sin ruta propia) navegan a su primera hija.
 * El indicador activo es un subrayado alineado con el borde inferior del header.
 */
export function PrimaryTabs({
  tree,
  activeId,
}: {
  tree: SectionTreeNode[];
  activeId?: string;
}) {
  const sectionLabel = useSectionLabel();
  return (
    <nav className="flex h-14 min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sortByOrder(tree).map((node) => {
        const Icon = resolveIcon(node.icon);
        const to = firstRoute(node) ?? '#';
        const active = node.id === activeId;

        return (
          <Link
            key={node.id}
            to={to}
            className={cn(
              'relative flex h-full shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors duration-(--duration-base)',
              'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors after:duration-(--duration-base)',
              active
                ? 'text-foreground after:bg-primary'
                : 'text-muted-foreground hover:text-foreground after:bg-transparent',
            )}
          >
            <Icon size={16} />
            {sectionLabel(node.code, node.name)}
          </Link>
        );
      })}
    </nav>
  );
}
