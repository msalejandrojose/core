import type { StorageDriverName, StoredFileStatus } from '@core/shared-types';

export type { StorageDriverName, StoredFileStatus };

export interface StoredFile {
  id: string;
  ownerUserId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  driver: StorageDriverName;
  status: StoredFileStatus;
  storageKey: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
