import { Municipality as MunicipalityRow } from '../../../../generated/prisma/client';
import { Municipality } from '../../domain/entities/municipality.entity';

export class MunicipalityMapper {
  static toDomain(row: MunicipalityRow): Municipality {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      provinceId: row.provinceId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
