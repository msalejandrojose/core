import { useState } from 'react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

/**
 * Login contra `POST /auth/login`. En éxito guarda token + usuario en el store
 * (lo que dispara el render del área autenticada). Expone estado de carga y un
 * mensaje de error legible.
 */
export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(email: string, password: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError, response } = await apiClient.POST(
        '/auth/login',
        { body: { email, password } },
      );
      // La API no declara respuestas de error en el OpenAPI, así que openapi-fetch
      // tipa la rama de error como inalcanzable; leemos el status del `response`
      // fuera del guard (en runtime openapi-fetch sí rellena data/error).
      const status = response.status;
      if (apiError || !data) {
        setError(
          status === 401
            ? 'Credenciales inválidas'
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        );
        return;
      }
      login(data.accessToken, data.user);
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
