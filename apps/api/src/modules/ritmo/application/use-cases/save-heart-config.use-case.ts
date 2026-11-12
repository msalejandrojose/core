import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import type { HeartConfig } from '../../domain/entities/performance.entity';

@Injectable()
export class SaveHeartConfigUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  execute(userId: string, config: HeartConfig): Promise<HeartConfig> {
    // Las zonas a mano solo tienen sentido con el método CUSTOM.
    return this.performance.saveHeartConfig(userId, {
      ...config,
      customZones: config.method === 'CUSTOM' ? config.customZones : null,
    });
  }
}
