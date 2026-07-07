import { Region as RegionRow } from '../../../../generated/prisma/client';
import { Region } from '../../domain/entities/region.entity';

export class RegionMapper {
  static toDomain(row: RegionRow): Region {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      countryId: row.countryId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
