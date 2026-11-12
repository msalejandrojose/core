import { Inject, Injectable } from '@nestjs/common';
import { runEngines } from '../../domain/services/performance/performance-engine';
import {
  reconcile,
  type RecommendationStatus,
} from '../../domain/services/performance/recommendation-state';
import {
  buildRecommendations,
  type Recommendation,
} from '../../domain/services/performance/recommendations';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import { PerformanceDataLoader } from './performance-data.loader';

export interface RecommendationWithState extends Recommendation {
  status: RecommendationStatus;
  /** Día en que se detectó por primera vez (en esta racha). */
  detectedOn: string;
}

/**
 * Recomendaciones vigentes. Se recalculan en cada consulta con los motores y
 * se cruzan con su estado guardado, así que editar o borrar un entreno las
 * actualiza solo: las que dejan de cumplirse pasan a RESOLVED.
 */
@Injectable()
export class GetRecommendationsUseCase {
  constructor(
    private readonly loader: PerformanceDataLoader,
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  async execute(
    userId: string,
    includeDismissed: boolean,
  ): Promise<RecommendationWithState[]> {
    const data = await this.loader.load(userId);
    // Las reglas usan las ventanas propias de cada motor, no un periodo elegido.
    const current = buildRecommendations(runEngines(data, '30d'), data.today);

    const stored = await this.performance.listRecommendationStates(userId);
    const next = reconcile(
      stored,
      current.map((r) => r.id),
      data.today,
    );
    // Solo se escribe si algo ha cambiado: consultar dos veces el mismo día
    // con los mismos datos no toca la base de datos.
    const before = new Map(stored.map((s) => [s.key, s]));
    const changed = next.filter((s) => {
      const prev = before.get(s.key);
      return (
        !prev ||
        prev.status !== s.status ||
        prev.firstDetectedOn !== s.firstDetectedOn ||
        prev.lastSeenOn !== s.lastSeenOn
      );
    });
    await this.performance.saveRecommendationStates(userId, changed);

    const states = new Map(next.map((s) => [s.key, s]));
    return current
      .map((r) => {
        const state = states.get(r.id)!;
        return {
          ...r,
          status: state.status,
          detectedOn: state.firstDetectedOn,
        };
      })
      .filter((r) => includeDismissed || r.status === 'ACTIVE');
  }
}
