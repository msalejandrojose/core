import { afterEach, describe, expect, it, vi } from 'vitest';

// El store importa el cliente de la API, que exige VITE_API_URL; aquí no se llama.
vi.mock('@/api/client', () => ({ apiClient: {} }));
import { useAuthStore } from '@/store/auth.store';
import { useBrioStore } from './brio.store';
import { installSessionReset } from './session-reset';

describe('installSessionReset', () => {
  let uninstall: () => void = () => {};
  afterEach(() => uninstall());

  it('vacía el perfil y el día al cerrar sesión', () => {
    useAuthStore.setState({ isAuthenticated: true });
    uninstall = installSessionReset();
    useBrioStore.setState({ profileStatus: 'ready', needsOnboarding: true, dayStatus: 'ready' });

    useAuthStore.getState().logout();

    const s = useBrioStore.getState();
    expect(s.profile).toBeNull();
    expect(s.profileStatus).toBe('idle');
    expect(s.dayStatus).toBe('idle');
    expect(s.summary).toBeNull();
  });
});
