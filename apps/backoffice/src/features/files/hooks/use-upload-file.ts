import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { uploadFileRequest } from '../lib/http';

export function useUploadFile({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFileRequest(file),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('Fichero subido');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al subir el fichero'));
    },
  });
}
