import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';
import type { components } from '@core/api-client';

export type AdminFood = components['schemas']['AdminFoodDto'];
export type SaveFood = components['schemas']['SaveAdminFoodDto'];
export type AdminExercise = components['schemas']['AdminExerciseDto'];
export type SaveExercise = components['schemas']['SaveAdminExerciseDto'];
export type AdminActivityType = components['schemas']['AdminActivityTypeDto'];
export type SaveActivityType = components['schemas']['SaveAdminActivityTypeDto'];

/** Mensajes de los códigos de error de los catálogos. */
const ERRORS: Record<string, string> = {
  BRIO_FOOD_MACROS_EXCEED_KCAL: 'Los macros dan más calorías que las indicadas. Revisa los números.',
  BRIO_FOOD_BARCODE_TAKEN: 'Ese código de barras ya lo tiene otro alimento.',
  BRIO_FOOD_SERVING_DUPLICATED: 'Hay dos raciones con el mismo nombre.',
  BRIO_EXERCISE_PRIMARY_MUSCLE_REQUIRED: 'Marca al menos un músculo como principal.',
  BRIO_EXERCISE_MUSCLES_INVALID: 'Revisa los músculos: hay alguno repetido o no válido.',
  BRIO_EXERCISE_CODE_TAKEN: 'Ese código ya lo usa otro ejercicio.',
  BRIO_ACTIVITY_CODE_TAKEN: 'Ese código ya lo usa otro tipo de actividad.',
};

const errorText = (e: unknown, fallback: string) => {
  const code = (e as { code?: string; message?: string } | null)?.code ?? (e as { message?: string } | null)?.message;
  return (code && ERRORS[code]) || getApiErrorMessage(e, fallback);
};

export function useBrioFoods(q: { q: string; source: string; unverified: boolean; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['brio', 'foods', q],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/brio/foods', {
        params: {
          query: {
            ...(q.q ? { q: q.q } : {}),
            ...(q.source ? { source: q.source as AdminFood['source'] } : {}),
            ...(q.unverified ? { unverified: true } : {}),
            page: q.page,
            pageSize: q.pageSize,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBrioFood(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveFood }) => {
      const r = id
        ? await apiClient.PUT('/admin/brio/foods/{id}', { params: { path: { id } }, body })
        : await apiClient.POST('/admin/brio/foods', { body });
      if (r.error) throw r.error;
      return r.data;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['brio', 'foods'] });
      toast.success('Alimento guardado');
      onDone?.();
    },
    onError: (e) => toast.error(errorText(e, 'No se pudo guardar el alimento')),
  });
}

export function useDeleteBrioFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/brio/foods/{id}', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['brio', 'foods'] });
      toast.success('Alimento borrado');
    },
    onError: (e) => toast.error(errorText(e, 'No se pudo borrar')),
  });
}

export function useBrioExercises(q: string) {
  return useQuery({
    queryKey: ['brio', 'exercises', q],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/brio/exercises', {
        params: { query: { q } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBrioExercise(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveExercise }) => {
      const r = id
        ? await apiClient.PUT('/admin/brio/exercises/{id}', { params: { path: { id } }, body })
        : await apiClient.POST('/admin/brio/exercises', { body });
      if (r.error) throw r.error;
      return r.data;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['brio', 'exercises'] });
      toast.success('Ejercicio guardado');
      onDone?.();
    },
    onError: (e) => toast.error(errorText(e, 'No se pudo guardar el ejercicio')),
  });
}

export function useBrioActivityTypes() {
  return useQuery({
    queryKey: ['brio', 'activity-types'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/brio/activity-types');
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBrioActivityType(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveActivityType }) => {
      const r = id
        ? await apiClient.PUT('/admin/brio/activity-types/{id}', { params: { path: { id } }, body })
        : await apiClient.POST('/admin/brio/activity-types', { body });
      if (r.error) throw r.error;
      return r.data;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['brio', 'activity-types'] });
      toast.success('Tipo de actividad guardado');
      onDone?.();
    },
    onError: (e) => toast.error(errorText(e, 'No se pudo guardar')),
  });
}

export const MUSCLES: { value: string; label: string }[] = [
  { value: 'CHEST', label: 'Pectoral' },
  { value: 'LATS', label: 'Dorsales' },
  { value: 'TRAPS', label: 'Trapecio' },
  { value: 'FRONT_DELT', label: 'Deltoides anterior' },
  { value: 'SIDE_DELT', label: 'Deltoides lateral' },
  { value: 'REAR_DELT', label: 'Deltoides posterior' },
  { value: 'BICEPS', label: 'Bíceps' },
  { value: 'TRICEPS', label: 'Tríceps' },
  { value: 'FOREARMS', label: 'Antebrazos' },
  { value: 'QUADS', label: 'Cuádriceps' },
  { value: 'HAMSTRINGS', label: 'Isquiotibiales' },
  { value: 'GLUTES', label: 'Glúteos' },
  { value: 'CALVES', label: 'Gemelos' },
  { value: 'ABS', label: 'Abdominales' },
  { value: 'LOWER_BACK', label: 'Lumbar' },
];

export const MEASURE_LABEL: Record<string, string> = {
  REPS: 'Repeticiones',
  DISTANCE: 'Distancia',
  TIME: 'Tiempo',
  CALORIES: 'Calorías',
};

export const KIND_LABEL: Record<string, string> = {
  STRENGTH: 'Fuerza',
  RUN: 'Carrera',
  CYCLE: 'Bici',
  WALK: 'Caminar',
  HIKE: 'Senderismo',
  SWIM: 'Natación',
  ELLIPTICAL: 'Elíptica',
  OTHER_CARDIO: 'Otro cardio',
  OTHER: 'Otro',
};
