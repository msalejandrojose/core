import type { TemplateExercise } from '../../domain/services/workout-template';

export const RITMO_WORKOUT_TEMPLATES = Symbol('RITMO_WORKOUT_TEMPLATES');

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: (TemplateExercise & { name: string; isBodyweight: boolean })[];
  updatedAt: string;
}

export interface SaveTemplateData {
  name: string;
  exercises: TemplateExercise[];
}

export interface WorkoutTemplatePort {
  /** Las plantillas del usuario, por nombre. */
  list(userId: string): Promise<WorkoutTemplate[]>;
  /** Crea la plantilla, o sustituye la que ya tenga ese nombre. */
  upsertByName(
    userId: string,
    data: SaveTemplateData,
  ): Promise<WorkoutTemplate>;
  /**
   * Cambia nombre y ejercicios. null si no existe; 'NAME_TAKEN' si otra
   * plantilla suya ya se llama así.
   */
  update(
    userId: string,
    id: string,
    data: SaveTemplateData,
  ): Promise<WorkoutTemplate | null | 'NAME_TAKEN'>;
  delete(userId: string, id: string): Promise<boolean>;
}
