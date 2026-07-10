import type { FileRef } from '@core/forms';
import { getAuthToken } from '@/store/auth.store';

const baseUrl = `${import.meta.env.VITE_API_URL}/v1`;

interface StoredFileResponse {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Sube un fichero vía `POST /files` (multipart) del módulo de storage y lo
 * traduce a la forma `FileRef` que usan los campos file/image/avatar de
 * `@core/forms`. El binario vive en storage; el formulario solo guarda la ref.
 */
export async function uploadFormFile(file: File): Promise<FileRef> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${baseUrl}/files`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    throw new Error('No se pudo subir el archivo');
  }
  const dto = (await res.json()) as StoredFileResponse;
  return {
    id: dto.id,
    name: dto.originalName,
    size: dto.sizeBytes,
    mimeType: dto.mimeType,
  };
}
