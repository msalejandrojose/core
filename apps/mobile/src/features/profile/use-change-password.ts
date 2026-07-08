import { useState } from 'react';
import { apiClient } from '@/api/client';

/**
 * Cambio de contraseña del usuario autenticado: `POST /auth/change-password`.
 * Un 401 aquí significa "la contraseña actual no es correcta"
 * (INVALID_CREDENTIALS), no sesión expirada; el cliente está configurado para
 * no cerrar sesión en este endpoint.
 */
export function useChangePassword() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { error: apiError, response } = await apiClient.POST(
        '/auth/change-password',
        { body: { currentPassword, newPassword } },
      );
      const status = response.status;
      if (apiError || status >= 400) {
        setError(
          status === 401
            ? 'La contraseña actual no es correcta.'
            : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.',
        );
        return;
      }
      setDone(true);
    } catch {
      setError('No se pudo cambiar la contraseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, done, error };
}
