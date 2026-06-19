import {
  Circle,
  Files,
  LayoutDashboard,
  LayoutList,
  Newspaper,
  Settings,
  Shield,
  SquareStack,
  Users,
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
  // Añadir según se creen secciones nuevas.
};

/** Resuelve el nombre de icono (string del árbol de secciones) a un componente de lucide. */
export function resolveIcon(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) || Circle;
}
