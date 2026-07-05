import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Lead } from '../../domain/entities/lead.entity';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
  type ListLeadsOptions,
} from '../ports/lead-repository.port';

@Injectable()
export class ListLeadsUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
  ) {}

  execute(opts: ListLeadsOptions): Promise<CursorPage<Lead>> {
    return this.leads.list(opts);
  }
}
