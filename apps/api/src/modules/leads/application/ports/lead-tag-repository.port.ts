import { LeadTag } from '../../domain/entities/lead-tag.entity';

export const LEAD_TAG_REPOSITORY = Symbol('LEADS_LEAD_TAG_REPOSITORY');

export interface CreateLeadTagData {
  name: string;
  color: string | null;
}

export interface LeadTagRepositoryPort {
  create(data: CreateLeadTagData): Promise<LeadTag>;
  list(): Promise<LeadTag[]>;
  findByName(name: string): Promise<LeadTag | null>;
  /** Devuelve, de los ids pasados, los que existen (para validar setTags). */
  findExistingIds(ids: string[]): Promise<string[]>;
}
