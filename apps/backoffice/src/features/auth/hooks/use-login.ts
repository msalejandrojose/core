import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Mutación de login. En éxito guarda token + usuario en el store y navega al
 * dashboard; en error muestra un toast. La API responde `{ accessToken, user }`.
 */
export function useLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data, error } = await apiClient.POST('/auth/login', {
        body: credentials,
      });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      login(data.accessToken, data.user);
      navigate('/dashboard');
    },
    onError() {
      toast.error('Credenciales inválidas');
    },
  });
}
