// Las URLs de fichero que devuelve la API son relativas al mount `/v1`
// (`/files/view?token=...`), igual que en mobile/web. Se resuelven aquí
// contra el mismo `baseUrl` que usa `@/api/client`.
const baseUrl = `${import.meta.env.VITE_API_URL}/v1`;

export function resolveFileUrl(path: string): string {
  return `${baseUrl}${path}`;
}
