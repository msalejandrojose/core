import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export type VerifyStatus = 'idle' | 'verifying' | 'ok' | 'error';

/**
 * Verifica el token de email: `GET /auth/verify-email?token=`. Se ejecuta solo
 * si hay token y no reintenta (un token inválido seguirá siéndolo). `idle`
 * cuando el enlace no trae token.
 */
export function useVerifyEmail(token: string): VerifyStatus {
  const [status, setStatus] = useState<VerifyStatus>(
    token ? 'verifying' : 'idle',
  );

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      return;
    }
    let active = true;
    setStatus('verifying');
    apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        if (active) setStatus('ok');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [token]);

  return status;
}
