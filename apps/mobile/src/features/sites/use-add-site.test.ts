import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddSite } from './use-add-site';

vi.mock('@/api/client', () => ({
  apiClient: { POST: vi.fn() },
}));

import { apiClient } from '@/api/client';

const api = apiClient as unknown as { POST: ReturnType<typeof vi.fn> };

const input = {
  name: 'Chiringuito',
  category: 'RESTAURANT' as const,
  latitude: 36.5,
  longitude: -4.9,
  tagNames: ['playa'],
  status: 'WANT_TO_GO' as const,
};

describe('useAddSite', () => {
  beforeEach(() => {
    api.POST.mockReset();
  });

  it('crea el sitio y lo añade a la lista con el estado elegido', async () => {
    api.POST.mockImplementation((path: string) => {
      if (path === '/andanzas/sites') {
        return Promise.resolve({ data: { id: 'site-1' } });
      }
      if (path === '/andanzas/site-entries') {
        return Promise.resolve({ data: {} });
      }
      throw new Error(`unexpected path ${path}`);
    });

    const { result } = renderHook(() => useAddSite());
    let ok = false;
    await act(async () => {
      ok = await result.current.submit(input);
    });

    expect(ok).toBe(true);
    expect(api.POST).toHaveBeenNthCalledWith(1, '/andanzas/sites', {
      body: {
        name: 'Chiringuito',
        category: 'RESTAURANT',
        latitude: 36.5,
        longitude: -4.9,
        address: undefined,
        externalPlaceId: undefined,
        tagNames: ['playa'],
      },
    });
    expect(api.POST).toHaveBeenNthCalledWith(2, '/andanzas/site-entries', {
      body: { siteId: 'site-1', status: 'WANT_TO_GO' },
    });
    expect(result.current.error).toBeNull();
  });

  it('si falla la creación del sitio, no llega a crear la entrada', async () => {
    api.POST.mockResolvedValue({ error: {} });

    const { result } = renderHook(() => useAddSite());
    let ok = true;
    await act(async () => {
      ok = await result.current.submit(input);
    });

    expect(ok).toBe(false);
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('No se pudo guardar el sitio. Inténtalo de nuevo.');
  });

  it('si el sitio se crea pero falla la entrada, avisa sin perder el sitio creado', async () => {
    api.POST.mockImplementation((path: string) => {
      if (path === '/andanzas/sites') {
        return Promise.resolve({ data: { id: 'site-1' } });
      }
      return Promise.resolve({ error: {} });
    });

    const { result } = renderHook(() => useAddSite());
    let ok = true;
    await act(async () => {
      ok = await result.current.submit(input);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe(
      'El sitio se creó, pero no se pudo añadir a tu lista. Inténtalo de nuevo.',
    );
  });

  it('no manda tagNames vacío ni address vacío', async () => {
    api.POST.mockImplementation((path: string) =>
      path === '/andanzas/sites'
        ? Promise.resolve({ data: { id: 'site-1' } })
        : Promise.resolve({ data: {} }),
    );

    const { result } = renderHook(() => useAddSite());
    await act(async () => {
      await result.current.submit({ ...input, tagNames: [], address: '' });
    });

    expect(api.POST).toHaveBeenNthCalledWith(1, '/andanzas/sites', {
      body: expect.objectContaining({ tagNames: undefined, address: undefined }),
    });
  });
});
