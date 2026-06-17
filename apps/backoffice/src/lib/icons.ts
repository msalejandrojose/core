// BO-07 — Resolución de iconos del sidebar
//
// `Section.icon` es un string que mapea a un componente de `lucide-react`.
// Mantenemos un mapa estático en lugar de import dinámico para:
//   - tree-shaking eficaz (solo se bundlea lo declarado aquí)
//   - errores de tipos si se referencia un icono inexistente
//
// Cuando aparezca una sección con un icono nuevo, añadirlo al mapa.

import {
  Circle,
  Files,
  LayoutDashboard,
  LayoutList,
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
};

/**
 * Devuelve el componente de icono asociado al `name`. Si el nombre no
 * está registrado o es `undefined`, se devuelve `Circle` como fallback
 * para no romper el render del sidebar.
 */
export function resolveIcon(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) ?? Circle;
}
