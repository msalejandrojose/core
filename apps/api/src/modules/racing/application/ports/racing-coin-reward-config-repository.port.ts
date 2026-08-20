import {
  RacingCoinRewardConfig,
  RacingCoinRewardKey,
} from '../../domain/entities/racing-coin-reward-config.entity';
import { RacingCoinRewardAmounts } from '../../domain/racing-coin-rewards';

export const RACING_COIN_REWARD_CONFIG_REPOSITORY = Symbol(
  'RACING_COIN_REWARD_CONFIG_REPOSITORY',
);

// Sin create/delete: las nueve claves son un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — solo se listan y se ajusta su
// importe, mismo criterio que `RacingTerrainEffectRepositoryPort`.
export interface RacingCoinRewardConfigRepositoryPort {
  findAll(): Promise<RacingCoinRewardConfig[]>;
  findByKey(key: RacingCoinRewardKey): Promise<RacingCoinRewardConfig | null>;
  update(key: RacingCoinRewardKey, amount: number): Promise<RacingCoinRewardConfig>;
  /** Los nueve importes de una vez, listos para las funciones de dominio de
   *  `racing-coin-rewards.ts` — evita una query por bono dentro de un mismo
   *  use-case cuando hace falta consultar varios (p.ej. posición + amigo +
   *  racha en la misma carrera). */
  getAmounts(): Promise<RacingCoinRewardAmounts>;
}
