import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { StoredFile } from '../../domain/entities/stored-file.entity';
import {
  CreateStoredFileInput,
  ListStoredFilesOptions,
  PaginatedStoredFiles,
  StoredFileRepositoryPort,
} from '../../application/ports/stored-file-repository.port';
import { StoredFileMapper } from './stored-file.mapper';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class PrismaStoredFileRepository implements StoredFileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateStoredFileInput): Promise<StoredFile> {
    const row = await this.prisma.storedFile.create({
      data: {
        ownerUserId: input.ownerUserId ?? null,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        driver: input.driver,
        storageKey: input.storageKey,
        status: input.status ?? 'READY',
      },
    });
    return StoredFileMapper.toDomain(row);
  }

  async findById(id: string): Promise<StoredFile | null> {
    const row = await this.prisma.storedFile.findUnique({ where: { id } });
    return row ? StoredFileMapper.toDomain(row) : null;
  }

  async list(options: ListStoredFilesOptions): Promise<PaginatedStoredFiles> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = {
      deletedAt: null,
      ...(options.ownerUserId ? { ownerUserId: options.ownerUserId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.storedFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.storedFile.count({ where }),
    ]);

    return { items: rows.map((row) => StoredFileMapper.toDomain(row)), total };
  }

  async markReady(
    id: string,
    sizeBytes: number,
    mimeType?: string,
  ): Promise<StoredFile> {
    const row = await this.prisma.storedFile.update({
      where: { id },
      data: { status: 'READY', sizeBytes, ...(mimeType ? { mimeType } : {}) },
    });
    return StoredFileMapper.toDomain(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.storedFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
