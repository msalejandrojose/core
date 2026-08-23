import { RacingLeagueConfigKey } from './entities/racing-league-config.entity';
import { RacingLeagueTier } from './entities/racing-league-standing.entity';
import {
  tierForPoints,
  tierThresholdsFromConfig,
  type RacingLeagueTierThresholds,
} from './racing-league-tier';

const THRESHOLDS: RacingLeagueTierThresholds = {
  silver: 50,
  gold: 150,
  platinum: 350,
  diamond: 700,
};

describe('tierForPoints', () => {
  it('empieza en Bronce', () => {
    expect(tierForPoints(0, THRESHOLDS)).toBe(RacingLeagueTier.BRONZE);
    expect(tierForPoints(49, THRESHOLDS)).toBe(RacingLeagueTier.BRONZE);
  });

  it('sube de liga en cuanto los puntos cruzan cada umbral, al instante', () => {
    expect(tierForPoints(50, THRESHOLDS)).toBe(RacingLeagueTier.SILVER);
    expect(tierForPoints(149, THRESHOLDS)).toBe(RacingLeagueTier.SILVER);
    expect(tierForPoints(150, THRESHOLDS)).toBe(RacingLeagueTier.GOLD);
    expect(tierForPoints(349, THRESHOLDS)).toBe(RacingLeagueTier.GOLD);
    expect(tierForPoints(350, THRESHOLDS)).toBe(RacingLeagueTier.PLATINUM);
    expect(tierForPoints(699, THRESHOLDS)).toBe(RacingLeagueTier.PLATINUM);
    expect(tierForPoints(700, THRESHOLDS)).toBe(RacingLeagueTier.DIAMOND);
  });

  it('también desciende: si los puntos bajaran de umbral, la liga baja igual', () => {
    // No hay forma de PERDER puntos hoy (no hay racha negativa), pero la
    // función en sí es pura sobre el número que le des — probarlo deja claro
    // que el ascenso/descenso es simétrico, no un one-way ratchet.
    expect(tierForPoints(49, THRESHOLDS)).toBe(RacingLeagueTier.BRONZE);
  });

  it('un techo altísimo sigue siendo Diamante, no revienta', () => {
    expect(tierForPoints(999999, THRESHOLDS)).toBe(RacingLeagueTier.DIAMOND);
  });
});

describe('tierThresholdsFromConfig', () => {
  it('extrae los 4 umbrales del Map plano de config', () => {
    const amounts = new Map([
      [RacingLeagueConfigKey.TIER_SILVER_THRESHOLD, 50],
      [RacingLeagueConfigKey.TIER_GOLD_THRESHOLD, 150],
      [RacingLeagueConfigKey.TIER_PLATINUM_THRESHOLD, 350],
      [RacingLeagueConfigKey.TIER_DIAMOND_THRESHOLD, 700],
    ]);

    expect(tierThresholdsFromConfig(amounts)).toEqual(THRESHOLDS);
  });

  it('sin alguna clave en el Map, no lanza y usa 0', () => {
    expect(tierThresholdsFromConfig(new Map())).toEqual({
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    });
  });
});
