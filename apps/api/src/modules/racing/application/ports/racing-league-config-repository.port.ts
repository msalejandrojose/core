import {
  RacingLeagueConfig,
  RacingLeagueConfigKey,
} from '../../domain/entities/racing-league-config.entity';
import { RacingLeaguePointsAmounts } from '../../domain/racing-league-points';

export const RACING_LEAGUE_CONFIG_REPOSITORY = Symbol(
  'RACING_LEAGUE_CONFIG_REPOSITORY',
);

// Sin create/delete: las siete claves son un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — solo se listan y se ajusta su
// valor, mismo criterio que `RacingCoinRewardConfigRepositoryPort`.
export interface RacingLeagueConfigRepositoryPort {
  findAll(): Promise<RacingLeagueConfig[]>;
  findByKey(key: RacingLeagueConfigKey): Promise<RacingLeagueConfig | null>;
  update(key: RacingLeagueConfigKey, value: number): Promise<RacingLeagueConfig>;
  /** Los siete valores de una vez, listos para `leaguePointsForPosition`/
   *  `tierThresholdsFromConfig` — evita una query por clave dentro del mismo
   *  cálculo. */
  getAmounts(): Promise<RacingLeaguePointsAmounts>;
}
