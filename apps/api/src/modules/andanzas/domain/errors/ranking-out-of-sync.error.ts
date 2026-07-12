import { DomainError } from '../../../../shared/errors/domain-error';

// El flujo de puntuación es sin estado en el servidor: cada paso recalcula
// el "bucket" de sitios de la banda a partir de la BBDD. Si entre dos pasos
// ese bucket cambió (otra puntuación concurrente del mismo usuario), el
// sitio de comparación que el cliente dice haber visto ya no coincide con
// el que el servidor recalcula — el cliente debe reiniciar el flujo
// (`POST .../rating`).
export class RankingOutOfSyncError extends DomainError {
  constructor(siteId: string) {
    super(
      'ANDANZAS_RANKING_OUT_OF_SYNC',
      'La comparación ha quedado desincronizada, reinicia el flujo de puntuación.',
      { siteId },
    );
  }
}
