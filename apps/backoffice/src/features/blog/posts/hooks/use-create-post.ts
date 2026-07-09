import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreatePostInput {
  title: string;
  content: string;
  slug?: string;
  excerpt?: string;
  categoryId?: string;
  tagIds?: string[];
  coverImageId?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export function useCreatePost({
  onSuccess,
}: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePostInput) => {
      const { data, error } = await apiClient.POST('/blog/posts', { body });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post creado como borrador');
      if (data) onSuccess?.(data.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el post'));
    },
  });
}
