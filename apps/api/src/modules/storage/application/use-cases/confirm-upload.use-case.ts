import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT, type StoragePort } from '../ports/storage.port';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { StoredFile } from '../../domain/entities/stored-file.entity';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';

/** Verifica que el binario llegó al storage físico tras una signed upload URL. */
@Injectable()
export class ConfirmUploadUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
  ) {}

  async execute(id: string): Promise<StoredFile> {
    const file = await this.repository.findById(id);
    if (!file || file.deletedAt) {
      throw new FileNotFoundError(id);
    }

    const stat = await this.storage.stat(file.storageKey);
    if (!stat) {
      throw new BadRequestException('El fichero todavía no llegó al storage.');
    }

    return this.repository.markReady(id, stat.sizeBytes, stat.contentType);
  }
}
