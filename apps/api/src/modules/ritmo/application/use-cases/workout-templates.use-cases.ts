import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RitmoExerciseNotFoundError } from '../../domain/errors/ritmo-exercise-not-found.error';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import {
  RITMO_WORKOUT_TEMPLATES,
  type SaveTemplateData,
  type WorkoutTemplate,
  type WorkoutTemplatePort,
} from '../ports/workout-template.port';

/** Nombre limpio: sin espacios sobrantes. */
const clean = (data: SaveTemplateData): SaveTemplateData => ({
  ...data,
  name: data.name.trim().replace(/\s+/g, ' '),
});

@Injectable()
export class ListWorkoutTemplatesUseCase {
  constructor(
    @Inject(RITMO_WORKOUT_TEMPLATES)
    private readonly templates: WorkoutTemplatePort,
  ) {}

  execute(userId: string): Promise<WorkoutTemplate[]> {
    return this.templates.list(userId);
  }
}

/**
 * Guarda una plantilla. Sin id, crea o sustituye la que se llame igual; con
 * id, la cambia. Solo admite ejercicios que el usuario puede usar.
 */
@Injectable()
export class SaveWorkoutTemplateUseCase {
  constructor(
    @Inject(RITMO_WORKOUT_TEMPLATES)
    private readonly templates: WorkoutTemplatePort,
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  async execute(
    userId: string,
    input: SaveTemplateData,
    id?: string,
  ): Promise<WorkoutTemplate> {
    const data = clean(input);
    const missing = await this.performance.missingExercises(
      [...new Set(data.exercises.map((e) => e.exerciseId))],
      userId,
    );
    if (missing.length) throw new RitmoExerciseNotFoundError(missing[0]);
    if (!id) return this.templates.upsertByName(userId, data);
    const saved = await this.templates.update(userId, id, data);
    if (saved === null) throw new NotFoundException('RITMO_TEMPLATE_NOT_FOUND');
    if (saved === 'NAME_TAKEN')
      throw new ConflictException('RITMO_TEMPLATE_NAME_TAKEN');
    return saved;
  }
}

@Injectable()
export class DeleteWorkoutTemplateUseCase {
  constructor(
    @Inject(RITMO_WORKOUT_TEMPLATES)
    private readonly templates: WorkoutTemplatePort,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    if (!(await this.templates.delete(userId, id)))
      throw new NotFoundException('RITMO_TEMPLATE_NOT_FOUND');
  }
}
