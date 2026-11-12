import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import type { HeartConfig } from '../../domain/entities/performance.entity';

/** Sin configurar aún se devuelve vacía (no es un error): el cliente pinta el formulario. */
@Injectable()
export class GetHeartConfigUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  async execute(userId: string): Promise<HeartConfig> {
    return (
      (await this.performance.getHeartConfig(userId)) ?? {
        maxHr: null,
        restingHr: null,
        method: 'MAX_HR',
        customZones: null,
      }
    );
  }
}
