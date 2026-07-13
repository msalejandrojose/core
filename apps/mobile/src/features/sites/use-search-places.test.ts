import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchPlaces } from './use-search-places';

vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn() },
}));

import { apiClient } from '@/api/client';

const api = apiClient as unknown as { GET: ReturnType<typeof vi.fn> };

describe('useSearchPlaces', () => {
  beforeEach(() => {
    api.GET.mockReset();
  });

  it('no busca por debajo del mínimo de caracteres', async () => {
    const { result } = renderHook(() => useSearchPlaces('c'));
    await new Promise((r) => setTimeout(r, 400));
    expect(api.GET).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('busca (con debounce) y devuelve los resultados', async () => {
    api.GET.mockResolvedValue({
      data: [
        {
          externalPlaceId: 'p1',
          name: 'Chiringuito',
          address: 'Playa',
          latitude: 36.5,
          longitude: -4.9,
        },
      ],
    });

    const { result } = renderHook(() => useSearchPlaces('chiringuito'));

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(api.GET).toHaveBeenCalledWith('/andanzas/sites/search', {
      params: { query: { q: 'chiringuito' } },
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('expone un error legible si falla la búsqueda', async () => {
    api.GET.mockResolvedValue({ error: {} });

    const { result } = renderHook(() => useSearchPlaces('chiringuito'));

    await waitFor(() =>
      expect(result.current.error).toBe('No se pudo buscar. Inténtalo de nuevo.'),
    );
    expect(result.current.results).toEqual([]);
  });
});
