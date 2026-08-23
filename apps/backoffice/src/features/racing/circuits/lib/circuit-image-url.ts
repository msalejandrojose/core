/**
 * `Circuit.imageUrl` (de la API) es una ruta relativa a la raíz versionada
 * (`/files/view?token=...`), el mismo patrón que ya usa `lib/http.ts` para
 * `baseUrl` — así que se resuelve igual: `${VITE_API_URL}/v1` + la ruta.
 */
export function resolveCircuitImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return `${import.meta.env.VITE_API_URL}/v1${imageUrl}`;
}
