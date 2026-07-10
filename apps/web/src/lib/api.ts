// Wrapper sobre @core/api-client (pendiente de generar) + fetch nativo.
// Una vez que api-client exista, sustituir el fetch directo por su instancia.

const apiUrl = `${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000'}/v1`;

export function getApiUrl(): string {
  return apiUrl;
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}
