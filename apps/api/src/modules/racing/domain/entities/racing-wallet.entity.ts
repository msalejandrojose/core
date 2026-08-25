// Fuente de un movimiento de monedas — cerrado por diseño (TASK-286).
export enum RacingCoinSource {
  RACE_FIRST_PLACE = 'RACE_FIRST_PLACE',
  RACE_SECOND_PLACE = 'RACE_SECOND_PLACE',
  RACE_THIRD_PLACE = 'RACE_THIRD_PLACE',
  REWARDED_AD = 'REWARDED_AD',
  // Cuantificados en TASK-321.
  PERSONAL_BEST = 'PERSONAL_BEST',
  BEAT_FRIEND = 'BEAT_FRIEND',
  WIN_STREAK = 'WIN_STREAK',
  // Sumideros (TASK-320): comprar en la tienda es la primera fuente que
  // resta en vez de sumar.
  PURCHASE_ARCHETYPE = 'PURCHASE_ARCHETYPE',
  PURCHASE_PART = 'PURCHASE_PART',
  PURCHASE_SKIN = 'PURCHASE_SKIN',
}

// Saldo de monedas de un jugador (TASK-318, economía de TASK-286). El
// número ya viene sumado — la fuente de verdad auditable de cómo se llegó
// a él vive en `RacingCoinLedgerEntry`, esto es solo el resultado.
export class RacingWallet {
  constructor(
    readonly userId: string,
    readonly balance: number,
  ) {}
}
