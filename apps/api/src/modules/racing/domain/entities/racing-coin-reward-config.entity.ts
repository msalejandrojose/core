// Qué importe se está editando (TASK-322) — más fino que `RacingCoinSource`:
// la racha de victorias es una única fuente en el ledger (`WIN_STREAK`) pero
// tres importes distintos según el tramo, así que necesita su propia clave.
export enum RacingCoinRewardKey {
  RACE_FIRST_PLACE = 'RACE_FIRST_PLACE',
  RACE_SECOND_PLACE = 'RACE_SECOND_PLACE',
  RACE_THIRD_PLACE = 'RACE_THIRD_PLACE',
  REWARDED_AD = 'REWARDED_AD',
  PERSONAL_BEST = 'PERSONAL_BEST',
  BEAT_FRIEND = 'BEAT_FRIEND',
  WIN_STREAK_2 = 'WIN_STREAK_2',
  WIN_STREAK_3 = 'WIN_STREAK_3',
  WIN_STREAK_4_PLUS = 'WIN_STREAK_4_PLUS',
}

// Fila editable desde el backoffice para uno de los importes de la economía
// de monedas (TASK-322). 0 = bono desactivado, no se acredita nada.
export class RacingCoinRewardConfig {
  constructor(
    readonly key: RacingCoinRewardKey,
    readonly amount: number,
  ) {}
}
