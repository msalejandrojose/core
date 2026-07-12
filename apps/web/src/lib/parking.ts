import { apiFetch, getApiUrl } from './api';

export interface PublicParkingSummary {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
  coverPhotoUrl: string | null;
}

export interface PublicParking {
  id: string;
  title: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
  photoUrls: string[];
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface SearchParkingsOptions {
  q?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// Las URLs de foto que devuelve la API son relativas al mount `/v1`
// (`/files/view?token=...`), así que se resuelven contra `getApiUrl()`.
export function resolvePhotoUrl(path: string): string {
  return `${getApiUrl()}${path}`;
}

export async function searchParkings(
  opts: SearchParkingsOptions = {},
): Promise<CursorPage<PublicParkingSummary>> {
  const query = buildQuery({
    q: opts.q,
    startDate: opts.startDate,
    endDate: opts.endDate,
    cursor: opts.cursor,
    limit: opts.limit,
  });
  return apiFetch<CursorPage<PublicParkingSummary>>(`/parking/public/parkings${query}`);
}

export async function getParking(id: string): Promise<PublicParking> {
  return apiFetch<PublicParking>(`/parking/public/parkings/${encodeURIComponent(id)}`);
}

// Trae TODAS las plazas publicadas recorriendo el cursor. Pensado para build
// time (SSG de `/plazas/[id]`), igual que `getAllPublishedPosts` en blog.ts.
export async function getAllPublishedParkings(): Promise<PublicParkingSummary[]> {
  const items: PublicParkingSummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await searchParkings({ cursor, limit: 50 });
    items.push(...page.data);
    cursor = page.meta.hasMore ? (page.meta.nextCursor ?? undefined) : undefined;
  } while (cursor);
  return items;
}
