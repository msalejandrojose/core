import { useState } from 'react';
import { apiClient } from '@/api/client';

/** Aplica el reset con el token recibido por email: `POST /auth/reset-password`. */
export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(token: string, password: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { error: apiError, response } = await apiClient.POST(
        '/auth/reset-password',
        { body: { token, password } },
      );
      // La API no declara respuestas de error en el OpenAPI; leemos el status del
      // `response` fuera del guard (openapi-fetch sí rellena error en runtime).
      const status = response.status;
      if (apiError || status >= 400) {
        setError(
          status === 400
            ? 'El enlace no es válido o ha caducado. Solicita uno nuevo.'
            : 'No se pudo restablecer la contraseña. Inténtalo de nuevo.',
        );
        return;
      }
      setDone(true);
    } catch {
      setError('No se pudo restablecer la contraseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, done, error };
}
