import { RacingCoinSource } from '../../domain/entities/racing-wallet.entity';

export const RACING_WALLET_REPOSITORY = Symbol('RACING_WALLET_REPOSITORY');

export interface CreditCoinsData {
  userId: string;
  amount: number;
  source: RacingCoinSource;
  /** La carrera online que generó el movimiento, si viene de una — ausente
   *  para fuentes que no vienen de una carrera (p.ej. anuncio). */
  onlineRaceId?: string;
  /** La vuelta que batió el récord personal, si el movimiento viene de eso
   *  (TASK-321) — ausente para el resto de fuentes. */
  lapTimeId?: string;
}

export interface RacingWalletRepositoryPort {
  /** 0 si el jugador todavía no tiene fila — nunca falla por falta de wallet. */
  getBalance(userId: string): Promise<number>;
  /** Ingresa monedas y deja constancia auditable del movimiento — nunca las
   *  resta (sin sumideros todavía, TASK-320). Devuelve el saldo resultante. */
  credit(data: CreditCoinsData): Promise<number>;
}
