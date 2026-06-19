/** Metadata de un fichero almacenado (alineada con `StoredFileResponseDto`). */
export interface StoredFile {
  id: string;
  ownerUserId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  driver: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Respuesta del listado de ficheros: `{ items, total }` (offset). */
export interface FilesListResponse {
  items: StoredFile[];
  total: number;
}
