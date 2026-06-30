import {
  RoleSectionAccessRecord,
  Section,
  SectionScope,
  UserSectionAccessRecord,
} from '../../domain/entities/section.entity';

export const SECTION_REPOSITORY = Symbol('SECTIONS_SECTION_REPOSITORY');

export interface SectionRepositoryPort {
  /** Devuelve todas las secciones activas de un scope (incluyendo SHARED). */
  findAllActiveByScope(scope: SectionScope): Promise<Section[]>;

  /** Lista grants/denies de los roles dados sobre cualquier sección. */
  findRoleAccess(userRoleIds: string[]): Promise<RoleSectionAccessRecord[]>;

  /** Lista grants/denies del usuario sobre cualquier sección. */
  findUserAccess(userId: string): Promise<UserSectionAccessRecord[]>;
}
