import { Inject, Injectable } from '@nestjs/common';
import { ApiSection } from '../../domain/entities/api-section.entity';
import { ApiSectionNotFoundError } from '../../domain/errors/api-section-not-found.error';
import { InvalidHierarchyError } from '../../domain/errors/invalid-hierarchy.error';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
  type UpdateApiSectionPatch,
} from '../ports/api-section-repository.port';

@Injectable()
export class UpdateApiSectionUseCase {
  constructor(
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
  ) {}

  async execute(id: string, patch: UpdateApiSectionPatch): Promise<ApiSection> {
    const existing = await this.sections.findById(id);
    if (!existing) throw new ApiSectionNotFoundError(id);

    if (patch.parentSectionId !== undefined && patch.parentSectionId !== null) {
      if (patch.parentSectionId === id) {
        throw new InvalidHierarchyError(
          'Una sección no puede ser su propia padre.',
        );
      }
      const parent = await this.sections.findById(patch.parentSectionId);
      if (!parent) throw new ApiSectionNotFoundError(patch.parentSectionId);

      // Detección de ciclo idéntica al rol.
      const ancestors = await this.sections.findAncestorsIncludingSelf(
        patch.parentSectionId,
      );
      if (ancestors.some((a) => a.id === id)) {
        throw new InvalidHierarchyError(
          'Asignar este parent crearía un ciclo en la jerarquía de secciones.',
        );
      }
    }

    return this.sections.update(id, patch);
  }
}
