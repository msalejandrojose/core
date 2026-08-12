import { useState } from 'react';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { ensureSocialLoginInitialized, isSocialLoginCancelled } from '@/lib/social-auth';

/**
 * Login nativo con Google (Credential Manager en Android, Sign In With Google
 * en iOS) contra `POST /auth/google`. El backend verifica el `idToken` contra
 * Google y crea o vincula el usuario — ver `LoginWithGoogleUseCase` en la API.
 */
export function useGoogleLogin() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await ensureSocialLoginInitialized();
      const { result } = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] },
      });

      const idToken = 'idToken' in result ? result.idToken : null;
      if (!idToken) {
        setError('No se pudo obtener el token de Google.');
        return;
      }

      const { data, error: apiError } = await apiClient.POST('/auth/google', {
        body: { idToken },
      });
      if (apiError || !data) {
        setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
        return;
      }
      login(data.accessToken, data.user);
    } catch (err) {
      if (!isSocialLoginCancelled(err)) {
        setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
