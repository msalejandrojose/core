import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { LeadTag } from '../../domain/entities/lead-tag.entity';
import {
  LEAD_TAG_REPOSITORY,
  type LeadTagRepositoryPort,
} from '../ports/lead-tag-repository.port';

export interface CreateLeadTagInput {
  name: string;
  color?: string | null;
}

@Injectable()
export class CreateLeadTagUseCase {
  constructor(
    @Inject(LEAD_TAG_REPOSITORY) private readonly tags: LeadTagRepositoryPort,
  ) {}

  async execute(input: CreateLeadTagInput): Promise<LeadTag> {
    const name = input.name.trim();
    const existing = await this.tags.findByName(name);
    if (existing)
      throw new ConflictException(`Ya existe una etiqueta "${name}".`);
    return this.tags.create({ name, color: input.color ?? null });
  }
}
