import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPush } from './push';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiClient } from '@/api/client';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(), getPlatform: vi.fn(() => 'ios') },
}));
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    addListener: vi.fn(),
    register: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock('@/api/client', () => ({
  apiClient: { POST: vi.fn(() => Promise.resolve({})) },
}));

type Fn = ReturnType<typeof vi.fn>;
const cap = Capacitor as unknown as { isNativePlatform: Fn; getPlatform: Fn };
const push = PushNotifications as unknown as Record<string, Fn>;
const api = apiClient as unknown as { POST: Fn };

// Listeners capturados por el mock de addListener, para poder dispararlos.
let listeners: Record<string, (arg: unknown) => void>;
const removeSpy = vi.fn();
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('registerPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners = {};
    push.addListener.mockImplementation((event: string, cb: (a: unknown) => void) => {
      listeners[event] = cb;
      return Promise.resolve({ remove: removeSpy });
    });
    push.register.mockResolvedValue(undefined);
  });

  it('es no-op en web/PWA (no plataforma nativa)', async () => {
    cap.isNativePlatform.mockReturnValue(false);
    const cleanup = await registerPush();
    expect(push.checkPermissions).not.toHaveBeenCalled();
    expect(push.register).not.toHaveBeenCalled();
    expect(typeof cleanup).toBe('function');
  });

  it('no registra si se deniega el permiso', async () => {
    cap.isNativePlatform.mockReturnValue(true);
    push.checkPermissions.mockResolvedValue({ receive: 'denied' });
    await registerPush();
    expect(push.requestPermissions).not.toHaveBeenCalled();
    expect(push.register).not.toHaveBeenCalled();
    expect(push.addListener).not.toHaveBeenCalled();
  });

  it('pide permiso si está en prompt, registra y sube el token a la API', async () => {
    cap.isNativePlatform.mockReturnValue(true);
    push.checkPermissions.mockResolvedValue({ receive: 'prompt' });
    push.requestPermissions.mockResolvedValue({ receive: 'granted' });

    await registerPush();

    expect(push.requestPermissions).toHaveBeenCalled();
    expect(push.register).toHaveBeenCalledTimes(1);
    expect(push.addListener).toHaveBeenCalledTimes(4);

    // Simula el evento de registro → registro del token contra la API.
    listeners['registration']({ value: 'tok-123' });
    await flush();
    expect(api.POST).toHaveBeenCalledWith('/me/devices', {
      body: { token: 'tok-123', platform: 'ios' },
    });
  });

  it('invoca los handlers de recepción y de tap (deep-link)', async () => {
    cap.isNativePlatform.mockReturnValue(true);
    push.checkPermissions.mockResolvedValue({ receive: 'granted' });
    const onReceived = vi.fn();
    const onAction = vi.fn();

    await registerPush({ onReceived, onAction });
    expect(push.requestPermissions).not.toHaveBeenCalled();

    const received = { title: 'Hola', data: {} };
    listeners['pushNotificationReceived'](received);
    expect(onReceived).toHaveBeenCalledWith(received);

    const notification = { data: { deepLink: '/tabs/notifications' } };
    listeners['pushNotificationActionPerformed']({ notification });
    expect(onAction).toHaveBeenCalledWith('/tabs/notifications', notification);
  });

  it('la función de limpieza quita los listeners', async () => {
    cap.isNativePlatform.mockReturnValue(true);
    push.checkPermissions.mockResolvedValue({ receive: 'granted' });
    const cleanup = await registerPush();
    cleanup();
    expect(removeSpy).toHaveBeenCalledTimes(4);
  });
});
