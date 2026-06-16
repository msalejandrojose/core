export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStat {
  sizeBytes: number;
  contentType?: string;
}

export interface SignedUploadUrl {
  url: string;
  /** Headers que el cliente debe enviar junto al PUT/POST al `url`. */
  headers?: Record<string, string>;
}

/**
 * Puerto de almacenamiento físico. Cada adapter (local/S3/GCS) implementa
 * esto contra su backend real; el resto del módulo solo conoce esta interfaz.
 */
export interface StoragePort {
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  stat(key: string): Promise<ObjectStat | null>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getSignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<SignedUploadUrl>;
}

export const STORAGE_PORT = 'STORAGE_PORT';
