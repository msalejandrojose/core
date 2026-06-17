import type { SectionTreeNode } from './types';

/**
 * Árbol de navegación del backoffice (scope BACKOFFICE).
 *
 * ⚠️ Temporal: hardcoded hasta que exista `GET /sections/tree` (TASK-38). El
 * contenido replica la navegación de BO-03. Mantiene la forma exacta del API
 * para que el cambio a datos remotos sea transparente.
 */
export const BACKOFFICE_SECTION_TREE: SectionTreeNode[] = [
  {
    id: 'dashboard',
    code: 'dashboard',
    name: 'Dashboard',
    icon: 'LayoutDashboard',
    route: '/dashboard',
    scope: 'BACKOFFICE',
    order: 0,
    isActive: true,
    children: [],
  },
  {
    id: 'iam',
    code: 'iam',
    name: 'IAM',
    icon: 'Shield',
    scope: 'BACKOFFICE',
    order: 1,
    isActive: true,
    children: [
      {
        id: 'iam.users',
        code: 'users',
        name: 'Usuarios',
        icon: 'Users',
        route: '/users',
        scope: 'BACKOFFICE',
        order: 0,
        isActive: true,
        children: [],
      },
      {
        id: 'iam.roles',
        code: 'roles',
        name: 'Roles',
        icon: 'Shield',
        route: '/roles',
        scope: 'BACKOFFICE',
        order: 1,
        isActive: true,
        children: [],
      },
    ],
  },
  {
    id: 'sections',
    code: 'sections',
    name: 'Secciones',
    icon: 'SquareStack',
    route: '/sections',
    scope: 'BACKOFFICE',
    order: 2,
    isActive: true,
    children: [],
  },
  {
    id: 'files',
    code: 'files',
    name: 'Archivos',
    icon: 'Files',
    route: '/files',
    scope: 'BACKOFFICE',
    order: 3,
    isActive: true,
    children: [],
  },
];
