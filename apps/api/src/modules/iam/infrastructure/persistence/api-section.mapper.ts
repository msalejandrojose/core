import type { ApiSectionModel } from '../../../../generated/prisma/models';
import { ApiSection } from '../../domain/entities/api-section.entity';

export class ApiSectionMapper {
  static toDomain(row: ApiSectionModel): ApiSection {
    return new ApiSection(
      row.id,
      row.code,
      row.name,
      row.description,
      row.parentSectionId,
      row.createdAt,
      row.updatedAt,
    );
  }

  static toPersistenceCreate(section: ApiSection) {
    return {
      id: section.id,
      code: section.code,
      name: section.name,
      description: section.description,
      parentSectionId: section.parentSectionId,
    };
  }
}
