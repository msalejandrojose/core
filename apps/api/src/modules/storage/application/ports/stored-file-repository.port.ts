import {
  StorageDriverName,
  StoredFile,
  StoredFileStatus,
} from '../../domain/entities/stored-file.entity';

export interface CreateStoredFileInput {
  ownerUserId?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  driver: StorageDriverName;
  storageKey: string;
  status?: StoredFileStatus;
}

export interface ListStoredFilesOptions {
  ownerUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedStoredFiles {
  items: StoredFile[];
  total: number;
}

export interface StoredFileRepositoryPort {
  create(input: CreateStoredFileInput): Promise<StoredFile>;
  findById(id: string): Promise<StoredFile | null>;
  list(options: ListStoredFilesOptions): Promise<PaginatedStoredFiles>;
  markReady(
    id: string,
    sizeBytes: number,
    mimeType?: string,
  ): Promise<StoredFile>;
  softDelete(id: string): Promise<void>;
}

export const STORED_FILE_REPOSITORY = 'STORED_FILE_REPOSITORY';
