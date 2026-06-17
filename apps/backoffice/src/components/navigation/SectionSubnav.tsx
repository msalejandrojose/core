import { NavLink } from 'react-router-dom';
import { sortByOrder } from '@/features/sections/nav';
import type { SectionTreeNode } from '@/features/sections/types';
import { resolveIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * Subnavegación de la sección activa: muestra sus hijas navegables como una fila
 * secundaria bajo las pestañas. No se renderiza si la sección no tiene hijas.
 */
export function SectionSubnav({ section }: { section: SectionTreeNode }) {
  const children = sortByOrder(section.children).filter((child) => child.route);
  if (children.length === 0) return null;

  return (
    <div className="bg-muted/40 border-b">
      <nav className="flex items-center gap-1 px-6 py-2">
        {children.map((child) => {
          const Icon = resolveIcon(child.icon);
          return (
            <NavLink
              key={child.id}
              to={child.route!}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                )
              }
            >
              <Icon size={14} />
              {child.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
