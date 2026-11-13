import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';

/** Descartar una recomendación o volver a activarla. */
@Injectable()
export class SetRecommendationStatusUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
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
    if (!ok) throw new NotFoundException('BRIO_RECOMMENDATION_NOT_FOUND');
  }
}
