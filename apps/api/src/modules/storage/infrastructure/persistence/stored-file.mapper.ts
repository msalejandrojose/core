import { StoredFile as StoredFileRow } from '../../../../generated/prisma/client';
import { StoredFile } from '../../domain/entities/stored-file.entity';

export class StoredFileMapper {
  static toDomain(row: StoredFileRow): StoredFile {
    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      driver: row.driver,
      status: row.status,
      storageKey: row.storageKey,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
