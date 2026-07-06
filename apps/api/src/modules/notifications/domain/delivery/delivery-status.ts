import type { DeliveryStatus } from '../entities/notification-delivery.entity';

// Ranking de estados. Como los webhooks pueden llegar desordenados, el estado
// efectivo de un envío se resuelve escogiendo el de mayor rango entre el actual
// y el entrante. Así:
//   - el engagement progresa (sent < delivered < opened < clicked),
//   - un `processed` tardío no "rebaja" un `delivered` ya registrado,
//   - los resultados negativos (bounce/dropped/spam/failed) tienen el rango más
//     alto y se quedan pegados (son terminales).
const RANK: Record<DeliveryStatus, number> = {
  pending: 0,
  sent: 1,
  deferred: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  unsubscribed: 5,
  spam: 6,
  dropped: 6,
  bounced: 6,
  failed: 6,
};

export function statusRank(status: DeliveryStatus): number {
  return RANK[status] ?? 0;
}

/**
 * Devuelve el estado que debe quedar tras recibir `incoming`, respetando el
 * ranking. Empates → gana el entrante (permite p. ej. bounce sobre dropped).
 */
export function mergeStatus(
  current: DeliveryStatus,
  incoming: DeliveryStatus,
): DeliveryStatus {
  return statusRank(incoming) >= statusRank(current) ? incoming : current;
}
