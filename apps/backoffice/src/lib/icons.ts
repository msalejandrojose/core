import {
  Circle,
  ClipboardList,
  Contact,
  Files,
  LayoutDashboard,
  LayoutList,
  Newspaper,
  Play,
  Settings,
  Shield,
  SquareStack,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Shield,
  SquareStack,
  Files,
  Settings,
  LayoutList,
  Newspaper,
  ClipboardList,
  Contact,
  Workflow,
  Play,
  Zap,
  // Añadir según se creen secciones nuevas.
};

/** Resuelve el nombre de icono (string del árbol de secciones) a un componente de lucide. */
export function resolveIcon(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) || Circle;
}
