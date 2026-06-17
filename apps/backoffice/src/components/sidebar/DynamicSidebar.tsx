// BO-07 — Sidebar dinámico construido a partir del árbol de secciones
//
// Sustituye al `Sidebar` hardcoded de BO-03. Los nodos sin `route` se
// renderizan como grupos no clickables; los nodos con `route` son
// `NavLink` con estado activo según la ruta actual.
//
// Errores en la carga del árbol producen un sidebar vacío sin crashear
// (la query devuelve `data === undefined` y el render se salta el map).

import { NavLink } from 'react-router-dom';
import type { SectionTreeNode } from '@core/sections';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useSectionTree } from '@/features/sections/hooks/use-section-tree';

export function DynamicSidebar() {
  const { data: tree, isLoading } = useSectionTree();

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold tracking-tight">Core BO</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          (tree ?? []).map((node) => (
            <SidebarNode key={node.id} node={node} depth={0} />
          ))
        )}
      </nav>
    </aside>
  );
}

interface SidebarNodeProps {
  node: SectionTreeNode;
  depth: number;
}

function SidebarNode({ node, depth }: SidebarNodeProps) {
  const Icon = resolveIcon(node.icon);

  // Nodo sin ruta = grupo/categoría no clickable
  if (!node.route) {
    return (
      <div className="mb-1">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400',
            depth > 0 && 'pl-6',
          )}
        >
          <Icon size={14} />
          {node.name}
        </div>
        {node.children.map((child) => (
          <SidebarNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <>
      <NavLink
        to={node.route}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            depth > 0 && 'pl-8',
            isActive
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
          )
        }
      >
        <Icon size={16} />
        {node.name}
      </NavLink>
      {node.children.map((child) => (
        <SidebarNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
}
