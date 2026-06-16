import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { STORAGE_PORT, type StoragePort } from '../ports/storage.port';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { StoredFile } from '../../domain/entities/stored-file.entity';
import { StorageDriver } from '../config/storage-driver';

export interface UploadFileInput {
  ownerUserId?: string | null;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
    @Inject(StorageDriver) private readonly driver: StorageDriver,
  ) {}

  async execute(input: UploadFileInput): Promise<StoredFile> {
    const key = `${randomUUID()}-${input.originalName}`;

    await this.storage.put({
      key,
      body: input.buffer,
      contentType: input.mimeType,
    });

    return this.repository.create({
      ownerUserId: input.ownerUserId ?? null,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      driver: this.driver.name,
      storageKey: key,
      status: 'READY',
    });
  }
}
