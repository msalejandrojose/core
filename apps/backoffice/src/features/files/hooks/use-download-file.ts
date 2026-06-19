import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { downloadFileRequest } from '../lib/http';

export function useDownloadFile() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      downloadFileRequest(id, filename),
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al descargar el fichero'));
    },
  });
}
