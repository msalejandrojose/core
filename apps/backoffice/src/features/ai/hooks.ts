import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';
import type { components } from '@core/api-client';

export type AiModel = components['schemas']['AiModelDto'];
export type AiSkill = components['schemas']['AiSkillDto'];
export type AiAgent = components['schemas']['AiAgentDto'];
export type AiTool = components['schemas']['AiToolDto'];
export type SaveAgent = components['schemas']['SaveAiAgentDto'];
export type SaveSkill = components['schemas']['SaveAiSkillDto'];
export type UpdateModel = components['schemas']['UpdateAiModelDto'];
export type Usage = components['schemas']['UsageResponseDto'];

const KEYS = {
  models: ['ai', 'models'] as const,
  skills: ['ai', 'skills'] as const,
  agents: ['ai', 'agents'] as const,
  tools: ['ai', 'tools'] as const,
};

export function useAiModels() {
  return useQuery({
    queryKey: KEYS.models,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ai/models');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateAiModel(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateModel }) => {
      const { data, error } = await apiClient.PATCH('/admin/ai/models/{id}', { params: { path: { id } }, body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['ai'] });
      toast.success('Modelo guardado');
      onDone?.();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar el modelo')),
  });
}

export function useAiSkills() {
  return useQuery({
    queryKey: KEYS.skills,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ai/skills');
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveAiSkill(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveSkill }) => {
      const res = id
        ? await apiClient.PUT('/admin/ai/skills/{id}', { params: { path: { id } }, body })
        : await apiClient.POST('/admin/ai/skills', { body });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['ai'] });
      toast.success('Skill guardada');
      onDone?.();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar la skill')),
  });
}

export function useDeleteAiSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/ai/skills/{id}', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['ai'] });
      toast.success('Skill borrada');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo borrar la skill')),
  });
}

export function useAiAgents() {
  return useQuery({
    queryKey: KEYS.agents,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ai/agents');
      if (error) throw error;
      return data;
    },
  });
}

export function useAiAgent(id: string | undefined) {
  return useQuery({
    queryKey: [...KEYS.agents, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ai/agents/{id}', { params: { path: { id: id! } } });
      if (error) throw error;
      return data;
    },
  });
}

export function useAiTools() {
  return useQuery({
    queryKey: KEYS.tools,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ai/agents/tools');
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveAiAgent(onDone?: (agent: AiAgent) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveAgent }) => {
      const res = id
        ? await apiClient.PUT('/admin/ai/agents/{id}', { params: { path: { id } }, body })
        : await apiClient.POST('/admin/ai/agents', { body });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess(agent) {
      void qc.invalidateQueries({ queryKey: ['ai'] });
      toast.success('Agente guardado');
      if (agent) onDone?.(agent);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar el agente')),
  });
}

export interface UsageParams {
  agentId?: string;
  from?: string;
  page: number;
  limit: number;
}

export function useAiUsage(params: UsageParams) {
  return useQuery({
    queryKey: ['ai', 'usage', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ai/usage', { params: { query: params } });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/** USD con los decimales que hacen falta para céntimos de céntimo. */
export function formatUsd(v: number): string {
  if (v === 0) return '0 $';
  const digits = v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
  return `${v.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })} $`;
}

export const formatInt = (v: number) => v.toLocaleString('es-ES');

export const EFFORT_LABELS: Record<string, string> = {
  none: 'Sin razonar',
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  xhigh: 'Muy alto',
  max: 'Máximo',
};
