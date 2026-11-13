import { Inject, Injectable } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import type { HeartConfig } from '../../domain/entities/performance.entity';

/** Sin configurar aún se devuelve vacía (no es un error): el cliente pinta el formulario. */
@Injectable()
export class GetHeartConfigUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
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
