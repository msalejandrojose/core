import { PostalCode as PostalCodeRow } from '../../../../generated/prisma/client';
import { PostalCode } from '../../domain/entities/postal-code.entity';

export class PostalCodeMapper {
  static toDomain(row: PostalCodeRow): PostalCode {
    return {
      id: row.id,
      code: row.code,
      municipalityId: row.municipalityId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
