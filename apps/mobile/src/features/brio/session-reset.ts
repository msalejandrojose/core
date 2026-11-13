import { useAuthStore } from '@/store/auth.store';
import { useBrioStore } from './brio.store';
import { useHabitsStore } from './habits.store';
import { useRegisterStore } from './register.store';

/**
 * Al cerrar sesión se vacía todo lo que Brío guarda en memoria del usuario
 * (perfil, día, hábitos, hojas abiertas). Sin esto, quien entre después en el
 * mismo dispositivo vería los datos del anterior hasta recargar la app.
 */
export function installSessionReset(): () => void {
  let wasAuthenticated = useAuthStore.getState().isAuthenticated;
  return useAuthStore.subscribe((state) => {
    if (wasAuthenticated && !state.isAuthenticated) {
      useBrioStore.setState({
        profile: null,
        profileStatus: 'idle',
        needsOnboarding: false,
        summary: null,
        dayStatus: 'idle',
      });
      useHabitsStore.getState().invalidate();
      useRegisterStore.getState().close();
    }
    wasAuthenticated = state.isAuthenticated;
  });
}
