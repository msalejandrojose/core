import { Inject, Injectable } from '@nestjs/common';
import { Section } from '../../domain/entities/section.entity';
import { SectionAlreadyExistsError } from '../../domain/errors/section-already-exists.error';
import { SectionCycleError } from '../../domain/errors/section-cycle.error';
import { SectionNotFoundError } from '../../domain/errors/section-not-found.error';
import { SectionScopeMismatchError } from '../../domain/errors/section-scope-mismatch.error';
import {
  SECTION_REPOSITORY,
  SectionRepositoryPort,
  UpdateSectionPatch,
} from '../ports/section-repository.port';

@Injectable()
export class UpdateSectionUseCase {
  constructor(
    @Inject(SECTION_REPOSITORY)
    private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(id: string, patch: UpdateSectionPatch): Promise<Section> {
    const existing = await this.sections.findById(id);
    if (!existing) throw new SectionNotFoundError(id);

    const effectiveCode = patch.code ?? existing.code;
    const effectiveScope = patch.scope ?? existing.scope;

    if (effectiveCode !== existing.code || effectiveScope !== existing.scope) {
      const conflict = await this.sections.findByCodeAndScope(effectiveCode, effectiveScope);
      if (conflict && conflict.id !== id) {
        throw new SectionAlreadyExistsError(effectiveCode, effectiveScope);
      }
    }

    if (patch.parentId !== undefined) {
      if (patch.parentId !== null) {
        if (patch.parentId === id) throw new SectionCycleError();

        const parent = await this.sections.findById(patch.parentId);
        if (!parent) throw new SectionNotFoundError(patch.parentId);

        const parentScope = patch.scope ?? parent.scope;
        const childScope = effectiveScope;
        if (parentScope !== 'SHARED' && childScope !== parentScope) {
          throw new SectionScopeMismatchError(childScope, parentScope);
        }

        const allSections = await this.sections.findAll();
        const descendantIds = findDescendantIds(id, allSections);
        if (descendantIds.has(patch.parentId)) throw new SectionCycleError();
      }
    }

    return this.sections.update(id, patch);
  }
}

function findDescendantIds(sectionId: string, allSections: Section[]): Set<string> {
  const result = new Set<string>();
  const queue = [sectionId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const s of allSections) {
      if (s.parentId === current && !result.has(s.id)) {
        result.add(s.id);
        queue.push(s.id);
      }
    }
  }
  return result;
}
