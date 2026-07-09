import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardSummary } from './use-dashboard-summary';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn() },
}));

const mockGet = apiClient.GET as unknown as ReturnType<typeof vi.fn>;

describe('useDashboardSummary', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('carga los KPIs del resumen', async () => {
    mockGet.mockResolvedValue({
      data: { kpis: [{ slug: 'users', label: 'Usuarios', value: 12 }] },
    });
    const { result } = renderHook(() => useDashboardSummary());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.kpis).toEqual([
      { slug: 'users', label: 'Usuarios', value: 12 },
    ]);
    expect(mockGet).toHaveBeenCalledWith('/dashboard/summary');
  });

  it('marca error cuando el endpoint devuelve error', async () => {
    mockGet.mockResolvedValue({ error: { message: 'nope' } });
    const { result } = renderHook(() => useDashboardSummary());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('marca error cuando la llamada lanza', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useDashboardSummary());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('tolera una respuesta sin kpis (lista vacía)', async () => {
    mockGet.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useDashboardSummary());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.kpis).toEqual([]);
  });
});
