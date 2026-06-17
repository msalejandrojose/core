// Tipos públicos mínimos del package `@core/sections`.
//
// Esta es la primera entrega de tipos para que los consumidores
// (backoffice, app) puedan tipar sus llamadas a `/sections/tree`
// sin esperar al módulo backend completo (TASK-38).
//
// El package completo (modelo Prisma + módulo backend + helpers
// `defineSection`, `walkTree`) se entrega en TASK-38.

export type SectionScope = 'BACKOFFICE' | 'APP' | 'SHARED';

export interface SectionTreeNode {
  id: string;
  code: string;
  /** Clave i18n o label literal (v1: literal en español). */
  name: string;
  /** Nombre de un componente de `lucide-react`. */
  icon?: string;
  /** Path en la app. Ausente = nodo grupo, no clickable. */
  route?: string;
  scope: SectionScope;
  order: number;
  isActive: boolean;
  children: SectionTreeNode[];
}
