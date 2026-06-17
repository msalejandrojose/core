import { Files, LayoutDashboard, Shield, SquareStack, Users } from 'lucide-react';
import type { ElementType } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon?: ElementType;
  href?: string;
  children?: NavItem[];
}

// Navegación hardcoded (BO-03). En BO-07 se reemplaza por el árbol dinámico de @core/sections.
const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'IAM',
    icon: Shield,
    children: [
      { label: 'Usuarios', icon: Users, href: '/users' },
      { label: 'Roles', icon: Shield, href: '/roles' },
    ],
  },
  { label: 'Secciones', icon: SquareStack, href: '/sections' },
  { label: 'Archivos', icon: Files, href: '/files' },
];

export function Sidebar() {
  return (
    <aside className="bg-card flex w-60 flex-col border-r">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold tracking-tight">Core BO</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => (
          <SidebarItem key={item.label} item={item} depth={0} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({ item, depth }: { item: NavItem; depth: number }) {
  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="mb-1">
        <div
          className={cn(
            'text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wider uppercase',
            depth > 0 && 'pl-6',
          )}
        >
          {Icon && <Icon size={14} />}
          {item.label}
        </div>
        {item.children.map((child) => (
          <SidebarItem key={child.label} item={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href!}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          depth > 0 && 'pl-8',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      {Icon && <Icon size={16} />}
      {item.label}
    </NavLink>
  );
}
