import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnreadStore } from './notifications.store';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({ apiClient: { GET: vi.fn() } }));

const mockGet = apiClient.GET as unknown as ReturnType<typeof vi.fn>;

describe('useUnreadStore', () => {
  beforeEach(() => {
    mockGet.mockReset();
    useUnreadStore.getState().set(0);
  });

  it('set fija el contador y lo acota a >= 0', () => {
    useUnreadStore.getState().set(5);
    expect(useUnreadStore.getState().unread).toBe(5);
    useUnreadStore.getState().set(-3);
    expect(useUnreadStore.getState().unread).toBe(0);
  });

  it('decrement no baja de 0', () => {
    useUnreadStore.getState().set(1);
    useUnreadStore.getState().decrement();
    useUnreadStore.getState().decrement();
    expect(useUnreadStore.getState().unread).toBe(0);
  });

  it('reset pone el contador a 0', () => {
    useUnreadStore.getState().set(9);
    useUnreadStore.getState().reset();
    expect(useUnreadStore.getState().unread).toBe(0);
  });

  it('refresh lee el contador del servidor', async () => {
    mockGet.mockResolvedValue({ data: { count: 7 } });
    await useUnreadStore.getState().refresh();
    expect(mockGet).toHaveBeenCalledWith('/me/notifications/unread-count');
    expect(useUnreadStore.getState().unread).toBe(7);
  });

  it('refresh es best-effort: conserva el valor si la llamada falla', async () => {
    useUnreadStore.getState().set(3);
    mockGet.mockRejectedValue(new Error('down'));
    await useUnreadStore.getState().refresh();
    expect(useUnreadStore.getState().unread).toBe(3);
  });
});
