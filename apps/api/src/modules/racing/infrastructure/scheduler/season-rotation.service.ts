import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoRotateSeasonUseCase } from '../../application/use-cases/auto-rotate-season.use-case';

// Cierre y rotación automática de temporada (TASK-228): cada hora comprueba
// si la temporada abierta ya cumplió su duración y, si toca, la cierra y
// abre la siguiente sola — mismo patrón que `WorkflowSchedulerService`.
//
// v1 monoinstancia, mismo motivo y misma limitación aceptada que el
// scheduler de workflows: sin varias réplicas del API no hay doble disparo
// que evitar. Con varias, en el peor caso dos réplicas podrían rotar en la
// misma hora si las dos leen "toca rotar" antes de que la primera cierre —
// crearía como mucho una temporada de más, nunca datos corruptos (el
// histórico de cada `LapTime` ya quedó sellado con su temporada real), así
// que no hace falta un lock distribuido para una operación que pasa una vez
// cada `SEASON_DURATION_DAYS`.
@Injectable()
export class SeasonRotationService {
  private readonly logger = new Logger(SeasonRotationService.name);

  constructor(private readonly autoRotate: AutoRotateSeasonUseCase) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(): Promise<void> {
    try {
      await this.autoRotate.execute();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rotación de temporada falló: ${message}`);
    }
  }
}
