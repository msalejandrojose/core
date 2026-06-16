import { Inject, Injectable } from '@nestjs/common';
import {
  ListStoredFilesOptions,
  PaginatedStoredFiles,
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';

@Injectable()
export class ListFilesUseCase {
  constructor(
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
  ) {}

  async execute(
    options: ListStoredFilesOptions,
  ): Promise<PaginatedStoredFiles> {
    return this.repository.list(options);
  }
}
