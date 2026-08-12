import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';

export interface PreviewMessageTypeInput {
  to?: string;
  variables?: Record<string, unknown>;
}

/** Dry-run del envío: renderiza el contenido guardado con variables de ejemplo. */
export function usePreviewMessageType(id: string) {
  return useMutation({
    mutationFn: async (input: PreviewMessageTypeInput) => {
      const { data, error } = await apiClient.POST(
        '/message-types/{id}/preview',
        { params: { path: { id } }, body: input },
      );
      if (error) throw error;
      return data;
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al generar el preview'));
    },
  });
}
