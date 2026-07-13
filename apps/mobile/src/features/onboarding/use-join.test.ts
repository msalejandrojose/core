import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useJoin } from './use-join';
import { useAuthStore } from '@/store/auth.store';

vi.mock('@/api/client', () => ({
  apiClient: { POST: vi.fn() },
}));

import { apiClient } from '@/api/client';

const api = apiClient as unknown as { POST: ReturnType<typeof vi.fn> };

const authUser = {
  id: 'u1',
  email: 'nueva@andanzas.app',
  firstName: null,
  lastName: null,
  userType: 'APP' as const,
};

describe('useJoin', () => {
  beforeEach(() => {
    api.POST.mockReset();
    useAuthStore.getState().logout();
  });

  it('canjea el código y hace login automático', async () => {
    api.POST.mockImplementation((path: string) => {
      if (path === '/andanzas/invitations/{code}/redeem') {
        return Promise.resolve({ data: { userId: 'u1' }, response: { status: 201 } });
      }
      if (path === '/auth/login') {
        return Promise.resolve({
          data: { accessToken: 'tok', user: authUser },
          response: { status: 200 },
        });
      }
      throw new Error(`unexpected path ${path}`);
    });

    const { result } = renderHook(() => useJoin());
    await act(async () => {
      await result.current.submit({
        code: 'abcd1234',
        email: 'nueva@andanzas.app',
        password: 'password123',
      });
    });

    expect(api.POST).toHaveBeenCalledWith('/andanzas/invitations/{code}/redeem', {
      params: { path: { code: 'abcd1234' } },
      body: {
        email: 'nueva@andanzas.app',
        password: 'password123',
        firstName: undefined,
        lastName: undefined,
      },
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('tok');
    expect(result.current.error).toBeNull();
  });

  it('código inválido: error 400 y no llega a intentar login', async () => {
    api.POST.mockResolvedValue({ error: {}, response: { status: 400 } });

    const { result } = renderHook(() => useJoin());
    await act(async () => {
      await result.current.submit({
        code: 'BAD',
        email: 'x@x.com',
        password: 'password123',
      });
    });

    await waitFor(() =>
      expect(result.current.error).toBe(
        'El código de invitación no es válido o ha caducado.',
      ),
    );
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('email ya registrado: error 409', async () => {
    api.POST.mockResolvedValue({ error: {}, response: { status: 409 } });

    const { result } = renderHook(() => useJoin());
    await act(async () => {
      await result.current.submit({
        code: 'ABCD1234',
        email: 'ya@existe.com',
        password: 'password123',
      });
    });

    expect(result.current.error).toBe('Ya existe una cuenta con ese email.');
  });

  it('cuenta creada pero auto-login falla: pide login manual', async () => {
    api.POST.mockImplementation((path: string) => {
      if (path === '/andanzas/invitations/{code}/redeem') {
        return Promise.resolve({ data: { userId: 'u1' }, response: { status: 201 } });
      }
      return Promise.resolve({ error: {}, response: { status: 401 } });
    });

    const { result } = renderHook(() => useJoin());
    await act(async () => {
      await result.current.submit({
        code: 'ABCD1234',
        email: 'nueva@andanzas.app',
        password: 'password123',
      });
    });

    expect(result.current.accountCreated).toBe(true);
    expect(result.current.error).toBe('Cuenta creada. Inicia sesión para continuar.');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
