import { Inject, Injectable } from '@nestjs/common';
import { Section } from '../../domain/entities/section.entity';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
  ListSectionsOptions,
} from '../ports/section-repository.port';

@Injectable()
export class ListSectionsUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(
    opts: ListSectionsOptions,
  ): Promise<{ items: Section[]; total: number }> {
    return this.sections.list(opts);
  }
}
