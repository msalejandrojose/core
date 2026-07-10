import {
  Bell,
  Circle,
  ClipboardList,
  Contact,
  Files,
  Inbox,
  Layers,
  LayoutDashboard,
  LayoutList,
  MessageSquare,
  Newspaper,
  Play,
  Send,
  Settings,
  Shield,
  SquareStack,
  Users,
  Webhook,
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
  Bell,
  Send,
  MessageSquare,
  Layers,
  Inbox,
  Webhook,
  // Añadir según se creen secciones nuevas.
};

/** Resuelve el nombre de icono (string del árbol de secciones) a un componente de lucide. */
export function resolveIcon(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) || Circle;
}
