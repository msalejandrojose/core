import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { LeadSource, LeadStatus } from '../types';

function useLeadInvalidation() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ['leads'] });
    if (id) {
      void qc.invalidateQueries({ queryKey: ['lead', id] });
      void qc.invalidateQueries({ queryKey: ['lead-activities', id] });
    }
  };
}

export interface CreateLeadInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  source?: LeadSource;
  ownerId?: string;
  consentGiven?: boolean;
}

export function useCreateLead({
  onSuccess,
}: { onSuccess?: (id: string) => void } = {}) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (body: CreateLeadInput) => {
      const { data, error } = await apiClient.POST('/leads', { body });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      invalidate();
      toast.success('Lead creado');
      if (data) onSuccess?.(data.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el lead'));
    },
  });
}

export interface UpdateLeadInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  consentGiven?: boolean;
}

export function useUpdateLead(id: string) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (body: UpdateLeadInput) => {
      const { data, error } = await apiClient.PATCH('/leads/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(id);
      toast.success('Lead actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el lead'));
    },
  });
}

export function useChangeLeadStatus(id: string) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (body: { to: LeadStatus; reason?: string }) => {
      const { data, error } = await apiClient.POST('/leads/{id}/status', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(id);
      toast.success('Estado actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo cambiar el estado'));
    },
  });
}

export function useAssignLead(id: string) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (body: { ownerId: string }) => {
      const { data, error } = await apiClient.POST('/leads/{id}/assign', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(id);
      toast.success('Responsable asignado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo asignar el lead'));
    },
  });
}

export function useAddLeadNote(id: string) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (body: { body: string }) => {
      const { data, error } = await apiClient.POST('/leads/{id}/notes', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(id);
      toast.success('Nota añadida');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo añadir la nota'));
    },
  });
}

export function useConvertLead(id: string) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (body: { userId: string }) => {
      const { data, error } = await apiClient.POST('/leads/{id}/convert', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(id);
      toast.success('Lead convertido');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo convertir el lead'));
    },
  });
}

export function useSetLeadTags(id: string) {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: async (tagIds: string[]) => {
      const { data, error } = await apiClient.PUT('/leads/{id}/tags', {
        params: { path: { id } },
        body: { tagIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate(id);
      toast.success('Etiquetas actualizadas');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron actualizar las etiquetas'));
    },
  });
}
