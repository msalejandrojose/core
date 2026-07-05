import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../domain/entities/lead.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';

@Injectable()
export class GetLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
  ) {}

  async execute(id: string): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);
    return lead;
  }
}
