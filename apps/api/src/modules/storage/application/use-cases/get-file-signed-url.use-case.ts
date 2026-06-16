import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT, type StoragePort } from '../ports/storage.port';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';

@Injectable()
export class GetFileSignedUrlUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
  ) {}

  async execute(id: string, expiresInSeconds?: number): Promise<string> {
    const file = await this.repository.findById(id);
    if (!file || file.deletedAt) {
      throw new FileNotFoundError(id);
    }
    return this.storage.getSignedUrl(file.storageKey, expiresInSeconds);
  }
}
