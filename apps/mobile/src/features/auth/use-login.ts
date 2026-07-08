import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/**
 * Login contra `POST /auth/login`. En éxito guarda token + usuario en el store
 * (lo que dispara el render de la home). Expone estado de carga y un mensaje de
 * error legible.
 */
export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(email: string, password: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.accessToken, data.user);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Credenciales inválidas'
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
