import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoRotateCircuitsUseCase } from '../../application/use-cases/auto-rotate-circuits.use-case';

// Rotación diaria automática de circuitos (TASK-336): cada hora comprueba si
// ya tocó rotar hoy y, si es así, elige al azar los siguientes destacados —
// mismo patrón que `SeasonRotationService`, misma limitación aceptada de
// v1 monoinstancia (con varias réplicas, en el peor caso dos podrían rotar
// en la misma hora si ambas leen "toca rotar" antes de que la primera
// aplique el cambio; como mucho reelige una vez de más, nunca corrompe nada).
@Injectable()
export class CircuitRotationService {
  private readonly logger = new Logger(CircuitRotationService.name);

  constructor(private readonly autoRotate: AutoRotateCircuitsUseCase) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(): Promise<void> {
    try {
      await this.autoRotate.execute();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rotación de circuitos falló: ${message}`);
    }
  }
}
