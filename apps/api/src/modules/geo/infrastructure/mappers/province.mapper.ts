import { Province as ProvinceRow } from '../../../../generated/prisma/client';
import { Province } from '../../domain/entities/province.entity';

export class ProvinceMapper {
  static toDomain(row: ProvinceRow): Province {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      countryId: row.countryId,
      regionId: row.regionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
