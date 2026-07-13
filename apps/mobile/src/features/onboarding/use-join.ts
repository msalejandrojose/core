import { useState } from 'react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

export interface JoinInput {
  code: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Onboarding cerrado por invitación: canjea el código
 * (`POST /andanzas/invitations/{code}/redeem`), que crea la cuenta pero no
 * devuelve token por diseño (separa "crear cuenta" de "autenticar" — el
 * mismo endpoint que usaría un flujo sin login inmediato). Si la cuenta se
 * crea con éxito, inicia sesión a continuación con las mismas credenciales.
 */
export function useJoin() {
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Distingue "el canje falló" (el usuario puede reintentar el formulario) de
  // "la cuenta se creó pero el auto-login falló" (no tiene sentido reintentar
  // el canje: el código ya está usado; hay que mandarlo a /login).
  const [accountCreated, setAccountCreated] = useState(false);

  async function submit(input: JoinInput): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const code = input.code.trim();
      const { error: redeemError, response } = await apiClient.POST(
        '/andanzas/invitations/{code}/redeem',
        {
          params: { path: { code } },
          body: {
            email: input.email,
            password: input.password,
            firstName: input.firstName || undefined,
            lastName: input.lastName || undefined,
          },
        },
      );
      // La API no declara respuestas de error en el OpenAPI, así que
      // openapi-fetch tipa la rama de error como inalcanzable; leemos el
      // status del `response` fuera del guard (en runtime sí se rellena).
      const status = response.status;
      if (redeemError) {
        setError(
          status === 409
            ? 'Ya existe una cuenta con ese email.'
            : status === 400
              ? 'El código de invitación no es válido o ha caducado.'
              : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
        );
        return;
      }
      setAccountCreated(true);

      const { data, error: loginError } = await apiClient.POST('/auth/login', {
        body: { email: input.email, password: input.password },
      });
      if (loginError || !data) {
        setError('Cuenta creada. Inicia sesión para continuar.');
        return;
      }
      login(data.accessToken, data.user);
    } catch {
      setError('No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, accountCreated };
}
