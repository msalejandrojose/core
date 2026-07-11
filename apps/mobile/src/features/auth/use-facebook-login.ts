import { useState } from 'react';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { ensureSocialLoginInitialized, isSocialLoginCancelled } from '@/lib/social-auth';

/**
 * Login nativo con Facebook (SDK oficial) contra `POST /auth/facebook`. El
 * backend verifica el `accessToken` contra la Graph API (con `debug_token`
 * para confirmar que pertenece a nuestra app) y crea o vincula el usuario —
 * ver `LoginWithFacebookUseCase` en la API.
 */
export function useFacebookLogin() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await ensureSocialLoginInitialized();
      const { result } = await SocialLogin.login({
        provider: 'facebook',
        options: { permissions: ['email', 'public_profile'] },
      });

      const accessToken = result.accessToken?.token;
      if (!accessToken) {
        setError('No se pudo obtener el token de Facebook.');
        return;
      }

      const { data, error: apiError } = await apiClient.POST('/auth/facebook', {
        body: { accessToken },
      });
      if (apiError || !data) {
        setError('No se pudo iniciar sesión con Facebook. Inténtalo de nuevo.');
        return;
      }
      login(data.accessToken, data.user);
    } catch (err) {
      if (!isSocialLoginCancelled(err)) {
        setError('No se pudo iniciar sesión con Facebook. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
