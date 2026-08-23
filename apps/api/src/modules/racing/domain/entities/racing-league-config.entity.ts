// Parámetro editable de las ligas de temporada (TASK-291): puntos por
// posición (solo carreras con rivales de verdad, en vivo o asíncronas) + los
// 4 umbrales de ascenso, en un mismo conjunto — mismo criterio que
// `RacingMatchmakingConfigKey` (mezcla parámetros de naturaleza distinta en
// una sola tabla en vez de varias).
export enum RacingLeagueConfigKey {
  POINTS_FIRST_PLACE = 'POINTS_FIRST_PLACE',
  POINTS_SECOND_PLACE = 'POINTS_SECOND_PLACE',
  POINTS_THIRD_PLACE = 'POINTS_THIRD_PLACE',
  TIER_SILVER_THRESHOLD = 'TIER_SILVER_THRESHOLD',
  TIER_GOLD_THRESHOLD = 'TIER_GOLD_THRESHOLD',
  TIER_PLATINUM_THRESHOLD = 'TIER_PLATINUM_THRESHOLD',
  TIER_DIAMOND_THRESHOLD = 'TIER_DIAMOND_THRESHOLD',
}

// Fila editable desde el backoffice para uno de los parámetros de liga.
export class RacingLeagueConfig {
  constructor(
    readonly key: RacingLeagueConfigKey,
    readonly value: number,
  ) {}
}
