import { Inject, Injectable } from '@nestjs/common';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { StoredFile } from '../../domain/entities/stored-file.entity';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';

@Injectable()
export class GetFileUseCase {
  constructor(
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
  ) {}

  async execute(id: string): Promise<StoredFile> {
    const file = await this.repository.findById(id);
    if (!file || file.deletedAt) {
      throw new FileNotFoundError(id);
    }
    return file;
  }
}
