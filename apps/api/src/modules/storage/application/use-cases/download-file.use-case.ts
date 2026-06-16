import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT, type StoragePort } from '../ports/storage.port';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { StoredFile } from '../../domain/entities/stored-file.entity';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';

export interface DownloadFileResult {
  file: StoredFile;
  buffer: Buffer;
}

@Injectable()
export class DownloadFileUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
  ) {}

  async execute(id: string): Promise<DownloadFileResult> {
    const file = await this.repository.findById(id);
    if (!file || file.deletedAt) {
      throw new FileNotFoundError(id);
    }
    const buffer = await this.storage.get(file.storageKey);
    return { file, buffer };
  }
}
