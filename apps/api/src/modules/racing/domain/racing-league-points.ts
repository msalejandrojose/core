import { RacingLeagueConfigKey } from './entities/racing-league-config.entity';

// `Map` y no `Record`: quien llama ya tiene un `Map` a mano (viene directo
// de las filas de BD), mismo criterio que `RacingCoinRewardAmounts`.
export type RacingLeaguePointsAmounts = ReadonlyMap<RacingLeagueConfigKey, number>;

// Puntos por posición en una carrera con rivales DE VERDAD — en vivo o
// asíncrona (contra hasta 2 fantasmas). Vuelta suelta y contrarreloj no
// puntúan: no hay nadie contra quien competir. 0 más allá de 3º, o si el
// admin desactivó el bono poniéndolo a 0 (o negativo, por error).
export function leaguePointsForPosition(
  position: number,
  amounts: RacingLeaguePointsAmounts,
): number {
  const key = KEY_FOR_POSITION[position];
  if (!key) return 0;
  return Math.max(0, amounts.get(key) ?? 0);
}

const KEY_FOR_POSITION: Record<number, RacingLeagueConfigKey | undefined> = {
  1: RacingLeagueConfigKey.POINTS_FIRST_PLACE,
  2: RacingLeagueConfigKey.POINTS_SECOND_PLACE,
  3: RacingLeagueConfigKey.POINTS_THIRD_PLACE,
};
