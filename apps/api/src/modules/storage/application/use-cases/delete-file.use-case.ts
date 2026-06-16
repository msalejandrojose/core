import { Inject, Injectable } from '@nestjs/common';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../ports/stored-file-repository.port';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';

/**
 * Borrado lógico (`deletedAt`). El binario sigue en el storage físico hasta
 * que un job de purga aparte lo borre definitivamente (fuera de alcance aquí).
 */
@Injectable()
export class DeleteFileUseCase {
  constructor(
    @Inject(STORED_FILE_REPOSITORY)
    private readonly repository: StoredFileRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const file = await this.repository.findById(id);
    if (!file || file.deletedAt) {
      throw new FileNotFoundError(id);
    }
    await this.repository.softDelete(id);
  }
}
