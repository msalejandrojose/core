import { call, isApiError } from './api';

/** Contrato de `/ritmo/templates`: plantillas de entreno de fuerza. */

export interface TemplateExercise {
  exerciseId: string;
  name: string;
  isBodyweight: boolean;
  sets: number;
  reps: number | null;
  weightKg: number | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  updatedAt: string;
}

export interface SaveTemplateBody {
  name: string;
  exercises: { exerciseId: string; sets: number; reps?: number; weightKg?: number }[];
}

export const templatesApi = {
  list: () => call<WorkoutTemplate[]>('GET', '/ritmo/templates'),
  /** Crea, o sustituye la que tenga el mismo nombre. */
  create: (body: SaveTemplateBody) => call<WorkoutTemplate>('POST', '/ritmo/templates', { body }),
  update: (id: string, body: SaveTemplateBody) =>
    call<WorkoutTemplate>('PUT', `/ritmo/templates/${id}`, { body }),
  remove: (id: string) => call<void>('DELETE', `/ritmo/templates/${id}`),
};

const ERROR_TEXT: Record<string, string> = {
  RITMO_TEMPLATE_NAME_TAKEN: 'Ya tienes otra plantilla con ese nombre.',
  RITMO_TEMPLATE_NOT_FOUND: 'Esa plantilla ya no existe.',
  RITMO_EXERCISE_NOT_FOUND: 'Uno de los ejercicios ya no existe.',
};

export function templateErrorText(e: unknown): string | undefined {
  if (!isApiError(e)) return undefined;
  return ERROR_TEXT[e.code] ?? ERROR_TEXT[e.message] ?? e.message;
}

/** "Jalón al pecho, Remo en polea baja y 3 más". */
export function templateSummary(t: WorkoutTemplate): string {
  const names = t.exercises.map((e) => e.name);
  if (names.length <= 2) return names.join(' y ');
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`;
}
