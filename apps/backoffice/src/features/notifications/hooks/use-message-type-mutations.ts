import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';

export interface CreateMessageTypeInput {
  key: string;
  name: string;
  accountId: string;
  content: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateMessageTypeInput {
  name?: string;
  accountId?: string;
  content?: Record<string, unknown>;
  isActive?: boolean;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['message-types'] });
}

export function useCreateMessageType({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateMessageTypeInput) => {
      const { data, error } = await apiClient.POST('/message-types', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(qc);
      toast.success('Tipo de mensaje creado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el tipo de mensaje'));
    },
  });
}

export function useUpdateMessageType({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateMessageTypeInput;
    }) => {
      const { data, error } = await apiClient.PATCH('/message-types/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(qc);
      toast.success('Tipo de mensaje actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(
        getApiErrorMessage(error, 'Error al actualizar el tipo de mensaje'),
      );
    },
  });
}

export function useDeleteMessageType({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/message-types/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      invalidate(qc);
      toast.success('Tipo de mensaje eliminado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el tipo de mensaje'));
    },
  });
}
