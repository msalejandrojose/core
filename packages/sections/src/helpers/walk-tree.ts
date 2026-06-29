import type { SectionTreeNode } from '../types.js';

export function walkTree(
  tree: SectionTreeNode[],
  visitor: (node: SectionTreeNode, depth: number) => void,
  depth = 0,
): void {
  for (const node of tree) {
    visitor(node, depth);
    walkTree(node.children, visitor, depth + 1);
  }
}

export function findSection(
  tree: SectionTreeNode[],
  code: string,
): SectionTreeNode | undefined {
  for (const node of tree) {
    if (node.code === code) return node;
    const inChild = findSection(node.children, code);
    if (inChild) return inChild;
  }
  return undefined;
}

export function flattenTree(tree: SectionTreeNode[]): SectionTreeNode[] {
  const out: SectionTreeNode[] = [];
  walkTree(tree, (node) => out.push(node));
  return out;
}
