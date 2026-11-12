import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';

/** Descartar una recomendación o volver a activarla. */
@Injectable()
export class SetRecommendationStatusUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  async execute(
    userId: string,
    key: string,
    status: 'ACTIVE' | 'DISMISSED',
  ): Promise<void> {
    const ok = await this.performance.setRecommendationStatus(
      userId,
      key,
      status,
    );
    if (!ok) throw new NotFoundException('RITMO_RECOMMENDATION_NOT_FOUND');
  }
}
