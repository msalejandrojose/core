import type { StorageDriverName, StoredFileStatus } from '@core/shared-types';

/** Metadata de un fichero almacenado (alineada con `StoredFileResponseDto`). */
export interface StoredFile {
  id: string;
  ownerUserId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  driver: StorageDriverName;
  status: StoredFileStatus;
  createdAt: string;
  updatedAt: string;
}

/** Respuesta del listado de ficheros: `{ items, total }` (offset). */
export interface FilesListResponse {
  items: StoredFile[];
  total: number;
}
