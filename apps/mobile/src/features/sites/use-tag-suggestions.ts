import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { components } from '@core/api-client';

export type TagSuggestion = components['schemas']['TagSuggestionResponseDto'];

const DEBOUNCE_MS = 250;

/** Autocompletado de tags existentes por prefijo (`GET /andanzas/tags/suggest`). */
export function useTagSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      apiClient
        .GET('/andanzas/tags/suggest', { params: { query: { q: trimmed } } })
        .then(({ data }) => {
          if (active && data) setSuggestions(data);
        })
        .catch(() => {
          // El autocompletado es best-effort: si falla, no bloquea escribir el tag a mano.
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return suggestions;
}
