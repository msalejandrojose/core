import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';

export interface CreateAccountInput {
  typeId: string;
  name: string;
  config: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sending-accounts'] });
}

export function useCreateAccount({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAccountInput) => {
      const { data, error } = await apiClient.POST('/sending-accounts', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(qc);
      toast.success('Cuenta de envío creada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la cuenta'));
    },
  });
}

export function useUpdateAccount({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateAccountInput;
    }) => {
      const { data, error } = await apiClient.PATCH('/sending-accounts/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(qc);
      toast.success('Cuenta actualizada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar la cuenta'));
    },
  });
}

export function useDeleteAccount({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/sending-accounts/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      invalidate(qc);
      toast.success('Cuenta eliminada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(
        getApiErrorMessage(
          error,
          'No se puede eliminar: la cuenta tiene mensajes asociados',
        ),
      );
    },
  });
}
