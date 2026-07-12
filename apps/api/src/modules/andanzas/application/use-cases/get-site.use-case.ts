import { Inject, Injectable } from '@nestjs/common';
import { SiteWithTags } from '../../domain/entities/site.entity';
import { SiteNotFoundError } from '../../domain/errors/site-not-found.error';
import {
  SITE_REPOSITORY,
  type SiteRepositoryPort,
} from '../ports/site-repository.port';

@Injectable()
export class GetSiteUseCase {
  constructor(
    @Inject(SITE_REPOSITORY) private readonly sites: SiteRepositoryPort,
  ) {}

  async execute(id: string): Promise<SiteWithTags> {
    const site = await this.sites.findById(id);
    if (!site) throw new SiteNotFoundError(id);
    return site;
  }
}
