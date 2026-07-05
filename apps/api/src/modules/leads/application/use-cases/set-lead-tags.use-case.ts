import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../domain/entities/lead.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
import { LeadTagNotFoundError } from '../../domain/errors/lead-tag-not-found.error';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';
import {
  LEAD_TAG_REPOSITORY,
  type LeadTagRepositoryPort,
} from '../ports/lead-tag-repository.port';

@Injectable()
export class SetLeadTagsUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_TAG_REPOSITORY) private readonly tags: LeadTagRepositoryPort,
  ) {}

  async execute(id: string, tagIds: string[]): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);

    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length > 0) {
      const existing = await this.tags.findExistingIds(uniqueIds);
      const missing = uniqueIds.find((tid) => !existing.includes(tid));
      if (missing) throw new LeadTagNotFoundError(missing);
    }

    await this.leads.setTags(id, uniqueIds);
    const updated = await this.leads.findById(id);
    if (!updated) throw new LeadNotFoundError(id);
    return updated;
  }
}
