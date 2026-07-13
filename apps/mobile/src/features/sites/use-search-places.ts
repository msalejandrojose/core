import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { components } from '@core/api-client';

export type PlaceCandidate = components['schemas']['PlaceCandidateResponseDto'];

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

/**
 * Buscador de sitios contra el proveedor externo (`GET /andanzas/sites/search`,
 * Mapbox — TASK-165). Debounce en cliente para no lanzar una request por
 * pulsación; por debajo de `MIN_QUERY_LENGTH` no busca (coincide con el
 * mínimo que valida el DTO en la API).
 */
export function useSearchPlaces(query: string) {
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      apiClient
        .GET('/andanzas/sites/search', { params: { query: { q: trimmed } } })
        .then(({ data, error: apiError }) => {
          if (!active) return;
          if (apiError || !data) {
            setError('No se pudo buscar. Inténtalo de nuevo.');
            setResults([]);
            return;
          }
          setError(null);
          setResults(data);
        })
        .catch(() => {
          if (active) {
            setError('No se pudo buscar. Inténtalo de nuevo.');
            setResults([]);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading, error };
}
