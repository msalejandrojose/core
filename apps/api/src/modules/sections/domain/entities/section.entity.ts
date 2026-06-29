export type SectionScope = 'BACKOFFICE' | 'APP' | 'SHARED';
export type SectionAccessType = 'GRANT' | 'DENY';

export interface SectionProps {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  route: string | null;
  parentId: string | null;
  scope: SectionScope;
  order: number;
  isActive: boolean;
  apiRequirements: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Section implements SectionProps {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly icon: string | null;
  readonly route: string | null;
  readonly parentId: string | null;
  readonly scope: SectionScope;
  readonly order: number;
  readonly isActive: boolean;
  readonly apiRequirements: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SectionProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.icon = props.icon;
    this.route = props.route;
    this.parentId = props.parentId;
    this.scope = props.scope;
    this.order = props.order;
    this.isActive = props.isActive;
    this.apiRequirements = props.apiRequirements;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export interface RoleSectionAccessRecord {
  userRoleId: string;
  sectionId: string;
  access: SectionAccessType;
}

export interface UserSectionAccessRecord {
  userId: string;
  sectionId: string;
  access: SectionAccessType;
}
