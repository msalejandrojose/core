import { RacingLeagueConfigKey } from './entities/racing-league-config.entity';
import { RacingLeagueTier } from './entities/racing-league-standing.entity';
import type { RacingLeaguePointsAmounts } from './racing-league-points';

export interface RacingLeagueTierThresholds {
  silver: number;
  gold: number;
  platinum: number;
  diamond: number;
}

// Umbral CONTINUO (TASK-291): en cuanto los puntos cruzan una frontera, la
// liga cambia al instante — no hace falta esperar a cerrar temporada ni
// rankear a nadie más para saber en qué liga estás. Se compara de mayor a
// menor: el primer umbral que se alcanza gana.
export function tierForPoints(
  points: number,
  thresholds: RacingLeagueTierThresholds,
): RacingLeagueTier {
  if (points >= thresholds.diamond) return RacingLeagueTier.DIAMOND;
  if (points >= thresholds.platinum) return RacingLeagueTier.PLATINUM;
  if (points >= thresholds.gold) return RacingLeagueTier.GOLD;
  if (points >= thresholds.silver) return RacingLeagueTier.SILVER;
  return RacingLeagueTier.BRONZE;
}

// Extrae los 4 umbrales del `Map` plano que da `RacingLeagueConfigRepositoryPort`
// — separado de `tierForPoints` para que esa quede pura sobre un tipo
// pequeño y fácil de fabricar en un test, sin acoplarse al `Map` de config.
export function tierThresholdsFromConfig(
  amounts: RacingLeaguePointsAmounts,
): RacingLeagueTierThresholds {
  return {
    silver: amounts.get(RacingLeagueConfigKey.TIER_SILVER_THRESHOLD) ?? 0,
    gold: amounts.get(RacingLeagueConfigKey.TIER_GOLD_THRESHOLD) ?? 0,
    platinum: amounts.get(RacingLeagueConfigKey.TIER_PLATINUM_THRESHOLD) ?? 0,
    diamond: amounts.get(RacingLeagueConfigKey.TIER_DIAMOND_THRESHOLD) ?? 0,
  };
}
