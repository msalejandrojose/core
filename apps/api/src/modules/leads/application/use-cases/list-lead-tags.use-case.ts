import { Inject, Injectable } from '@nestjs/common';
import { LeadTag } from '../../domain/entities/lead-tag.entity';
import {
  LEAD_TAG_REPOSITORY,
  type LeadTagRepositoryPort,
} from '../ports/lead-tag-repository.port';

@Injectable()
export class ListLeadTagsUseCase {
  constructor(
    @Inject(LEAD_TAG_REPOSITORY) private readonly tags: LeadTagRepositoryPort,
  ) {}

  execute(): Promise<LeadTag[]> {
    return this.tags.list();
  }
}
