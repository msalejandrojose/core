import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';

/** Aplica el reset con el token recibido por email: `POST /auth/reset-password`. */
export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(token: string, password: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'El enlace no es válido o ha caducado. Solicita uno nuevo.'
          : 'No se pudo restablecer la contraseña. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, done, error };
}
