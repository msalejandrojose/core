/**
 * Nodo del árbol de secciones navegables de la UI.
 *
 * Forma alineada con el futuro `GET /sections/tree?scope=BACKOFFICE` (TASK-38) y
 * el package `@core/sections`. Cuando ese módulo backend exista, este tipo se
 * moverá a `@core/sections` y `use-section-tree` consumirá el endpoint real.
 */
export interface SectionTreeNode {
  id: string;
  code: string;
  /** Etiqueta a mostrar. En v1 se usa directamente (sin i18n). */
  name: string;
  /** Nombre de icono de lucide-react (e.g. "Users", "Shield"). */
  icon?: string;
  /** Ruta en la app (e.g. "/users"). Si falta, el nodo es un grupo. */
  route?: string;
  scope: 'BACKOFFICE' | 'APP' | 'SHARED';
  order: number;
  isActive: boolean;
  children: SectionTreeNode[];
}
