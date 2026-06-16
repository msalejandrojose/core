import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  STORAGE_PORT,
  type SignedUploadUrl,
  type StoragePort,
} from '../ports/storage.port';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { StorageDriver } from '../config/storage-driver';

export interface CreateSignedUploadInput {
  ownerUserId?: string | null;
  originalName: string;
  mimeType: string;
}

export interface CreateSignedUploadResult {
  fileId: string;
  upload: SignedUploadUrl;
}

/**
 * Flujo de subida directa: el cliente sube el binario directamente al backend
 * de storage (típicamente S3) con esta URL firmada, sin pasar por nuestra API.
 * El registro queda en estado `PENDING` hasta `POST /files/:id/confirm`.
 */
@Injectable()
export class CreateSignedUploadUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
    @Inject(StorageDriver) private readonly driver: StorageDriver,
  ) {}

  async execute(
    input: CreateSignedUploadInput,
  ): Promise<CreateSignedUploadResult> {
    const key = `${randomUUID()}-${input.originalName}`;
    const upload = await this.storage.getSignedUploadUrl(key, input.mimeType);

    const file = await this.repository.create({
      ownerUserId: input.ownerUserId ?? null,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: 0,
      driver: this.driver.name,
      storageKey: key,
      status: 'PENDING',
    });

    return { fileId: file.id, upload };
  }
}
