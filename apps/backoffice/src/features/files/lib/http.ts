import { getAuthToken } from '@/store/auth.store';

const baseUrl = `${import.meta.env.VITE_API_URL}/v1`;

/**
 * Subida y descarga de ficheros van por `fetch` directo en lugar del cliente
 * tipado: el endpoint de subida es `multipart/form-data` (sin body tipado en el
 * OpenAPI) y la descarga devuelve un binario, no JSON. Reutilizamos el mismo
 * `baseUrl` y el token del auth store que usa `@/api/client`.
 */
function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (typeof body.message === 'string' && body.message) return body.message;
    if (Array.isArray(body.message)) return body.message.join(', ');
  } catch {
    /* respuesta sin body JSON */
  }
  return fallback;
}

/** Sube un fichero vía `POST /files` (multipart). */
export async function uploadFileRequest(file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${baseUrl}/files`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Error al subir el fichero'));
  }
}

/**
 * Descarga el binario vía `GET /files/:id/download` (con auth) y dispara la
 * descarga en el navegador con el nombre original.
 */
export async function downloadFileRequest(
  id: string,
  filename: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/files/${id}/download`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Error al descargar el fichero'));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
