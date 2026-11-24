import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getProfile = vi.fn();
const getDay = vi.fn();
vi.mock('@/api/client', () => ({ apiClient: {} }));
vi.mock('./api', async (orig) => ({
  ...(await orig<typeof import('./api')>()),
  brioApi: { getProfile: (...a: unknown[]) => getProfile(...a), getDay: (...a: unknown[]) => getDay(...a) },
}));

import { useAuthStore } from '@/store/auth.store';
import type { BrioProfile, DaySummary } from './api';
import { useBrioStore } from './brio.store';
import { todayIn } from './format';
import { readSnapshot, writeSnapshot } from './today-snapshot';

const profile = { timezone: 'Europe/Madrid' } as BrioProfile;
const summary = (kcal: number) => ({ totals: { kcal } }) as unknown as DaySummary;
const today = () => todayIn('Europe/Madrid');
const user = { id: 'u1', email: 'a@b.c', firstName: null, lastName: null, userType: 'APP' as const };

describe('foto de Hoy para arrancar al instante', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().login('t', user, 'r');
    useBrioStore.setState({ profile: null, profileStatus: 'idle', summary: null, dayStatus: 'idle', needsOnboarding: false });
  });
  afterEach(() => {
    getProfile.mockReset();
    getDay.mockReset();
  });

  it('pinta la última foto sin esperar a la API y la refresca por detrás', async () => {
    writeSnapshot('u1', profile, today(), summary(1200));
    let release!: (p: BrioProfile) => void;
    getProfile.mockReturnValue(new Promise((r) => (release = r)));
    getDay.mockResolvedValue(summary(1500));

    const loading = useBrioStore.getState().loadProfile();
    // Antes de que conteste la API ya hay perfil y día en pantalla.
    expect(useBrioStore.getState()).toMatchObject({ profileStatus: 'ready', dayStatus: 'ready', summary: summary(1200) });

    release(profile);
    await loading;
    await vi.waitFor(() => expect(useBrioStore.getState().summary).toEqual(summary(1500)));
    expect(readSnapshot('u1')?.summary).toEqual(summary(1500));
  });

  it('sin red mantiene la foto en vez de mostrar error', async () => {
    writeSnapshot('u1', profile, today(), summary(1200));
    getProfile.mockRejectedValue(new Error('offline'));
    getDay.mockRejectedValue(new Error('offline'));

    await useBrioStore.getState().loadProfile();

    expect(useBrioStore.getState()).toMatchObject({ profileStatus: 'ready', summary: summary(1200) });
  });

  it('ignora la foto de otro usuario o de otro día', async () => {
    writeSnapshot('otro', profile, today(), summary(1200));
    expect(readSnapshot('u1')).toBeNull();

    writeSnapshot('u1', profile, '2000-01-01', summary(1200));
    getProfile.mockResolvedValue(profile);
    await useBrioStore.getState().loadProfile();
    expect(useBrioStore.getState()).toMatchObject({ profileStatus: 'ready', dayStatus: 'idle', summary: null });
  });
});
