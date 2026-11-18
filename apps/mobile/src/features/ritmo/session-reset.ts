import { useAuthStore } from '@/store/auth.store';
import { useRitmoStore } from './ritmo.store';
import { useHabitsStore } from './habits.store';
import { useRegisterStore } from './register.store';
import { clearLive } from './sheets/live-workout';

/**
 * Al cerrar sesión se vacía todo lo que Ritmo guarda en memoria del usuario
 * (perfil, día, hábitos, hojas abiertas, entreno en vivo a medias). Sin esto, quien entre después en el
 * mismo dispositivo vería los datos del anterior hasta recargar la app.
 */
export function installSessionReset(): () => void {
  let wasAuthenticated = useAuthStore.getState().isAuthenticated;
  return useAuthStore.subscribe((state) => {
    if (wasAuthenticated && !state.isAuthenticated) {
      useRitmoStore.setState({
        profile: null,
        profileStatus: 'idle',
        needsOnboarding: false,
        summary: null,
        dayStatus: 'idle',
      });
      useHabitsStore.getState().invalidate();
      useRegisterStore.getState().close();
      // El entreno en vivo a medias es de quien cerró sesión.
      clearLive();
    }
    wasAuthenticated = state.isAuthenticated;
  });
}
