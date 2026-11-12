import type {
  Exercise,
  HeartConfig,
  MuscleWeight,
  PerfMetric,
  PerfOrigin,
  PerformanceMeasurement,
  TrainingSession,
} from '../../domain/entities/performance.entity';

export const RITMO_PERFORMANCE_REPOSITORY = Symbol(
  'RITMO_PERFORMANCE_REPOSITORY',
);

export interface CreateExerciseData {
  userId: string;
  name: string;
  isCompound: boolean;
  isBodyweight: boolean;
  muscles: MuscleWeight[];
}

export interface AddMeasurementData {
  userId: string;
  metric: PerfMetric;
  value: number;
  heartRate: number | null;
  origin: PerfOrigin;
  sourceLabel: string | null;
  measuredOn: string;
}

/**
 * Datos de entrada de los motores de rendimiento. Aquí no hay resultados
 * derivados: los motores los calculan al vuelo, así que editar o borrar un
 * entreno no deja nada que invalidar.
 */
export interface RitmoPerformanceRepositoryPort {
  /** Catálogo global más los ejercicios propios, con sus pesos por músculo. */
  listExercisesVisibleTo(userId: string): Promise<Exercise[]>;
  /** De una lista de ids, los que el usuario no puede usar. */
  missingExercises(ids: string[], userId: string): Promise<string[]>;
  createExercise(data: CreateExerciseData): Promise<Exercise>;

  getHeartConfig(userId: string): Promise<HeartConfig | null>;
  saveHeartConfig(userId: string, config: HeartConfig): Promise<HeartConfig>;

  listMeasurements(userId: string): Promise<PerformanceMeasurement[]>;
  addMeasurement(data: AddMeasurementData): Promise<PerformanceMeasurement>;
  deleteMeasurement(id: string, userId: string): Promise<boolean>;

  /**
   * Historial de entrenos con sus series, del más antiguo al más reciente.
   * `fromDay` nulo = histórico completo.
   */
  trainingHistory(
    userId: string,
    fromDay: string | null,
  ): Promise<TrainingSession[]>;
}
