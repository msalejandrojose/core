import {
  RacingMatchmakingConfig,
  RacingMatchmakingConfigKey,
} from '../../domain/entities/racing-matchmaking-config.entity';

export const RACING_MATCHMAKING_CONFIG_REPOSITORY = Symbol(
  'RACING_MATCHMAKING_CONFIG_REPOSITORY',
);

export type RacingMatchmakingConfigValues = ReadonlyMap<RacingMatchmakingConfigKey, number>;

// Sin create/delete: las tres claves son un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — mismo criterio que
// `RacingCoinRewardConfigRepositoryPort`.
export interface RacingMatchmakingConfigRepositoryPort {
  findAll(): Promise<RacingMatchmakingConfig[]>;
  findByKey(key: RacingMatchmakingConfigKey): Promise<RacingMatchmakingConfig | null>;
  update(key: RacingMatchmakingConfigKey, value: number): Promise<RacingMatchmakingConfig>;
  /** Los tres valores de una vez, listos para `LiveRaceRoomManager` — evita
   *  tres queries por sala cuando hace falta consultar varios a la vez. */
  getValues(): Promise<RacingMatchmakingConfigValues>;
}
