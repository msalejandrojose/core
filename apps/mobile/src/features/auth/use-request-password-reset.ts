import { useState } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Solicita el reset de contraseña: `POST /auth/request-password-reset`.
 * Por seguridad la API responde igual exista o no la cuenta, así que en éxito
 * mostramos siempre el mismo mensaje neutro.
 */
export function useRequestPasswordReset() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(email: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch {
      setError('No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, done, error };
}
