import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Section, SectionScope } from '../../domain/entities/section.entity';
import { SectionAlreadyExistsError } from '../../domain/errors/section-already-exists.error';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import { SectionScopeMismatchError } from '../../domain/errors/section-scope-mismatch.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
} from '../ports/section-repository.port';

export interface CreateSectionInput {
  code: string;
  name: string;
  icon?: string | null;
  route?: string | null;
  parentId?: string | null;
  scope: SectionScope;
  order?: number;
  apiRequirements?: string[];
}

@Injectable()
export class CreateSectionUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(input: CreateSectionInput): Promise<Section> {
    if (input.parentId) {
      const parent = await this.sections.findById(input.parentId);
      if (!parent) throw new SectionNotFoundError(input.parentId);
      if (parent.scope !== 'SHARED' && input.scope !== parent.scope) {
        throw new SectionScopeMismatchError(input.scope, parent.scope);
      }
    }

    const existing = await this.sections.findByCodeAndScope(input.code, input.scope);
    if (existing) throw new SectionAlreadyExistsError(input.code, input.scope);

    const now = new Date();
    return this.sections.create(
      new Section({
        id: randomUUID(),
        code: input.code,
        name: input.name,
        icon: input.icon ?? null,
        route: input.route ?? null,
        parentId: input.parentId ?? null,
        scope: input.scope,
        order: input.order ?? 0,
        isActive: true,
        apiRequirements: input.apiRequirements ?? [],
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
}
