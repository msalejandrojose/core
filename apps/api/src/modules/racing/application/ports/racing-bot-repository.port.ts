export const RACING_BOT_REPOSITORY = Symbol('RACING_BOT_REPOSITORY');

export interface RacingBotRepositoryPort {
  /** Hasta `count` ids de cuentas-bot, sin repetir ninguna de
   *  `excludeUserIds` (para no meter el mismo bot dos veces en una sala).
   *  Puede devolver menos de `count` si el pool no da para tanto. */
  pickBots(count: number, excludeUserIds: string[]): Promise<string[]>;
}
