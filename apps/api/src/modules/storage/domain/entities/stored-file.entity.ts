export type StorageDriverName = 'LOCAL' | 'S3' | 'GCS';
export type StoredFileStatus = 'PENDING' | 'READY';

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
