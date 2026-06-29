export type SectionScope = 'BACKOFFICE' | 'APP' | 'SHARED';
export type SectionAccessType = 'GRANT' | 'DENY';

export interface Section {
  id: string;
  code: string;
  name: string;
  icon?: string;
  route?: string;
  parentId?: string;
  scope: SectionScope;
  order: number;
  isActive: boolean;
  apiRequirements?: string[];
}

export interface SectionTreeNode extends Section {
  children: SectionTreeNode[];
}

export interface SectionInput {
  code: string;
  name: string;
  icon?: string;
  route?: string;
  order: number;
  apiRequirements?: string[];
  children?: SectionInput[];
}

export interface DefineSectionsArgs {
  scope: SectionScope;
  items: SectionInput[];
}
