import { RacingLeagueConfigKey } from './entities/racing-league-config.entity';
import { leaguePointsForPosition } from './racing-league-points';

const AMOUNTS = new Map([
  [RacingLeagueConfigKey.POINTS_FIRST_PLACE, 10],
  [RacingLeagueConfigKey.POINTS_SECOND_PLACE, 5],
  [RacingLeagueConfigKey.POINTS_THIRD_PLACE, 1],
]);

describe('leaguePointsForPosition', () => {
  it('da los puntos configurados por posición', () => {
    expect(leaguePointsForPosition(1, AMOUNTS)).toBe(10);
    expect(leaguePointsForPosition(2, AMOUNTS)).toBe(5);
    expect(leaguePointsForPosition(3, AMOUNTS)).toBe(1);
  });

  it('no da puntos más allá de 3º', () => {
    expect(leaguePointsForPosition(4, AMOUNTS)).toBe(0);
  });

  it('no da puntos con una posición inválida (0)', () => {
    expect(leaguePointsForPosition(0, AMOUNTS)).toBe(0);
  });

  it('con el importe a 0, no da puntos aunque sea 1º', () => {
    const amounts = new Map(AMOUNTS);
    amounts.set(RacingLeagueConfigKey.POINTS_FIRST_PLACE, 0);
    expect(leaguePointsForPosition(1, amounts)).toBe(0);
  });

  it('nunca da puntos negativos, aunque el importe configurado lo sea', () => {
    const amounts = new Map(AMOUNTS);
    amounts.set(RacingLeagueConfigKey.POINTS_FIRST_PLACE, -5);
    expect(leaguePointsForPosition(1, amounts)).toBe(0);
  });

  it('sin el importe en el Map, no lanza y da 0', () => {
    expect(leaguePointsForPosition(1, new Map())).toBe(0);
  });
});
