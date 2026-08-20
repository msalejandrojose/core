import { RacingCoinSource } from './entities/racing-wallet.entity';

export interface RacingCoinReward {
  amount: number;
  source: RacingCoinSource;
}

// Importes de partida ya cerrados en "Diseñar la economía de monedas y
// recompensas" (TASK-286) — ajustables sin validar con datos reales
// todavía, igual que el resto de cifras de ese documento. `position` es la
// posición EN ESA CARRERA (1 a 3, ver `RacingOnlineRaceParticipant`), no el
// puesto en el leaderboard general del circuito.
export function coinRewardForPosition(position: number): RacingCoinReward | null {
  switch (position) {
    case 1:
      return { amount: 100, source: RacingCoinSource.RACE_FIRST_PLACE };
    case 2:
      return { amount: 60, source: RacingCoinSource.RACE_SECOND_PLACE };
    case 3:
      return { amount: 40, source: RacingCoinSource.RACE_THIRD_PLACE };
    default:
      return null;
  }
}

// El anuncio ACELERA la progresión, no es la única vía razonable de
// conseguir monedas (TASK-286).
export const REWARDED_AD_COIN_REWARD: RacingCoinReward = {
  amount: 100,
  source: RacingCoinSource.REWARDED_AD,
};

// Cifras de TASK-321 — enriquecen las fuentes ya cuantificadas en TASK-286,
// no las sustituyen: se acreditan ADEMÁS del bono de posición cuando aplican.

// Solo por MEJORAR tu marca anterior en un circuito, no por la primera vuelta
// que subes ahí (sin marca previa no hay nada que batir todavía).
export const PERSONAL_BEST_COIN_REWARD: RacingCoinReward = {
  amount: 50,
  source: RacingCoinSource.PERSONAL_BEST,
};

// Por ganarle a un amigo en una carrera online (su fantasma como rival,
// TASK-223) — un flat único por carrera, no uno por cada amigo vencido si
// hubiera más de uno entre los rivales.
export const BEAT_FRIEND_COIN_REWARD: RacingCoinReward = {
  amount: 60,
  source: RacingCoinSource.BEAT_FRIEND,
};

// Escalado con tope (TASK-321): la 2ª victoria seguida da menos que la 3ª,
// que da menos que la 4ª — pero nunca más que el bono de quedar 1º (100),
// o ganar rachas largas pesaría más que ganar la carrera en sí.
// `streakLength` cuenta la victoria que se acaba de registrar (2 = la
// segunda seguida, incluida esta).
export function coinRewardForWinStreak(streakLength: number): RacingCoinReward | null {
  if (streakLength < 2) return null;
  const amount = streakLength === 2 ? 20 : streakLength === 3 ? 40 : 60;
  return { amount, source: RacingCoinSource.WIN_STREAK };
}
