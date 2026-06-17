import type { SectionTreeNode } from './types';

export function sortByOrder(nodes: SectionTreeNode[]): SectionTreeNode[] {
  return [...nodes].sort((a, b) => a.order - b.order);
}

/** Primera ruta navegable dentro del subárbol (para tabs-grupo sin ruta propia). */
export function firstRoute(node: SectionTreeNode): string | undefined {
  if (node.route) return node.route;
  for (const child of sortByOrder(node.children)) {
    const route = firstRoute(child);
    if (route) return route;
  }
  return undefined;
}

export function routeMatches(pathname: string, route?: string): boolean {
  if (!route) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** ¿Alguna ruta del subárbol coincide con la ubicación actual? */
export function subtreeActive(node: SectionTreeNode, pathname: string): boolean {
  if (routeMatches(pathname, node.route)) return true;
  return node.children.some((child) => subtreeActive(child, pathname));
}

export function findActiveTop(
  tree: SectionTreeNode[],
  pathname: string,
): SectionTreeNode | undefined {
  return tree.find((node) => subtreeActive(node, pathname));
}
