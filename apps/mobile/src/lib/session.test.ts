import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { refreshSession, secondsToExpiry } from './session';

vi.mock('@/api/config', () => ({
  API_URL: 'https://api.test',
  API_BASE_URL: 'https://api.test/v1',
  apiConfigured: true,
}));

const user = { id: 'u1', email: 'a@b.c', firstName: null, lastName: null, userType: 'APP' as const };

/** JWT de mentira con el `exp` dado (la firma no se comprueba en cliente). */
const jwt = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('sesión que se renueva sola', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.getState().login('old-access', user, 'old-refresh');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  const urlOf = (input: RequestInfo | URL) => (input instanceof Request ? input.url : String(input));
  const authOf = (input: RequestInfo | URL) => (input instanceof Request ? input.headers.get('Authorization') : null);

  it('ante un 401 renueva los tokens y repite la llamada', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).endsWith('/auth/refresh')) return json(200, { accessToken: 'new-access', refreshToken: 'new-refresh', user });
      return authOf(input) === 'Bearer new-access' ? json(200, { ok: true }) : json(401, {});
    });

    const { response } = await apiClient.GET('/auth/me');

    expect(response.status).toBe(200);
    expect(useAuthStore.getState()).toMatchObject({ token: 'new-access', refreshToken: 'new-refresh', isAuthenticated: true });
  });

  it('varias llamadas con 401 a la vez comparten una sola renovación', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).endsWith('/auth/refresh')) return json(200, { accessToken: 'new-access', refreshToken: 'new-refresh', user });
      return authOf(input) === 'Bearer new-access' ? json(200, {}) : json(401, {});
    });

    await Promise.all([apiClient.GET('/auth/me'), apiClient.GET('/auth/me'), apiClient.GET('/auth/me')]);

    const refreshes = fetchMock.mock.calls.filter(([input]) => urlOf(input).endsWith('/auth/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('cierra sesión solo si la API dice que el refresh token ya no vale', async () => {
    fetchMock.mockImplementation(async () => json(401, {}));
    await apiClient.GET('/auth/me');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sin red no cierra sesión', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).endsWith('/auth/refresh')) throw new TypeError('Failed to fetch');
      return json(401, {});
    });
    await apiClient.GET('/auth/me');
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, refreshToken: 'old-refresh' });
  });

  it('una sesión antigua sin refresh token se cierra como antes', async () => {
    useAuthStore.getState().login('old-access', user);
    fetchMock.mockImplementation(async () => json(401, {}));
    expect(await refreshSession()).toBe('expired');
  });
});

describe('secondsToExpiry', () => {
  it('lee el exp del JWT', () => {
    const now = Date.UTC(2026, 10, 24, 12);
    expect(secondsToExpiry(jwt(now / 1000 + 120), now)).toBe(120);
  });

  it('devuelve null si el token no es un JWT', () => {
    expect(secondsToExpiry('nope')).toBeNull();
  });
});
