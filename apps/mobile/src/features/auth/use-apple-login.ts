import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { ensureSocialLoginInitialized, isSocialLoginCancelled } from '@/lib/social-auth';

/**
 * ¿Se enseña «Continuar con Apple»? Solo en el iPhone y con la capacidad
 * «Sign in with Apple» activa en la app, que exige cuenta de desarrollador de
 * pago: hasta entonces se apaga con `VITE_APPLE_SIGN_IN` (ver NATIVE.md).
 */
export const appleSignInAvailable = () =>
  Capacitor.getPlatform() === 'ios' && import.meta.env.VITE_APPLE_SIGN_IN === 'true';

/**
 * Login con Apple (Sign in with Apple nativo) contra `POST /auth/apple`. La API
 * verifica el identity token con las claves de Apple. Apple solo da el nombre
 * la primera vez que se autoriza: se manda junto al token para crear la cuenta.
 */
export function useAppleLogin() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await ensureSocialLoginInitialized();
      const { result } = await SocialLogin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] },
      });

      const identityToken = 'idToken' in result ? result.idToken : null;
      if (!identityToken) {
        setError('No se pudo obtener el token de Apple.');
        return;
      }
      const profile = 'profile' in result ? result.profile : null;
      const name = profile && 'givenName' in profile ? profile : null;

      const { data, error: apiError } = await apiClient.POST('/auth/apple', {
        body: {
          identityToken,
          ...(name?.givenName ? { firstName: name.givenName } : {}),
          ...(name?.familyName ? { lastName: name.familyName } : {}),
        },
      });
      if (apiError || !data) {
        setError('No se pudo iniciar sesión con Apple. Inténtalo de nuevo.');
        return;
      }
      login(data.accessToken, data.user, data.refreshToken);
    } catch (err) {
      if (!isSocialLoginCancelled(err)) {
        setError('No se pudo iniciar sesión con Apple. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
