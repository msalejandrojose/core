import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from './use-notifications';
import { useUnreadStore } from './notifications.store';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() },
}));

const api = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>;
  PATCH: ReturnType<typeof vi.fn>;
  POST: ReturnType<typeof vi.fn>;
};

function notif(id: string, readAt: string | null = null) {
  return {
    id,
    title: `Notif ${id}`,
    body: null,
    readAt,
    createdAt: new Date().toISOString(),
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    api.GET.mockReset();
    api.PATCH.mockReset();
    api.POST.mockReset();
    useUnreadStore.getState().set(0);

    api.GET.mockImplementation((path: string) => {
      if (path === '/me/notifications') {
        return Promise.resolve({
          data: {
            data: [notif('1'), notif('2')],
            meta: { limit: 20, nextCursor: null, hasMore: false },
          },
        });
      }
      if (path === '/me/notifications/unread-count') {
        return Promise.resolve({ data: { count: 2 } });
      }
      return Promise.resolve({ data: null });
    });
    api.PATCH.mockResolvedValue({ data: {} });
    api.POST.mockResolvedValue({ data: {} });
  });

  it('carga las notificaciones paginadas', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('reload reconcilia el badge con el servidor', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.reload();
    });
    // El servidor reporta 2 no leídas (mock unread-count).
    expect(useUnreadStore.getState().unread).toBe(2);
  });

  it('markRead marca localmente, decrementa el badge y hace PATCH', async () => {
    // El badge ya trae un valor (lo fija TabsShell / el view-enter de la pantalla).
    useUnreadStore.getState().set(2);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.markRead('1');
    });

    expect(result.current.items.find((n) => n.id === '1')?.readAt).not.toBeNull();
    expect(useUnreadStore.getState().unread).toBe(1);
    expect(api.PATCH).toHaveBeenCalledWith('/me/notifications/{id}/read', {
      params: { path: { id: '1' } },
    });
  });

  it('markAllRead marca todas, pone el badge a 0 y hace POST', async () => {
    useUnreadStore.getState().set(2);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.items.every((n) => n.readAt !== null)).toBe(true);
    expect(useUnreadStore.getState().unread).toBe(0);
    expect(api.POST).toHaveBeenCalledWith('/me/notifications/read-all');
  });
});
