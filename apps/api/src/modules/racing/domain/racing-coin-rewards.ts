import { RacingCoinRewardKey } from './entities/racing-coin-reward-config.entity';
import { RacingCoinSource } from './entities/racing-wallet.entity';

export interface RacingCoinReward {
  amount: number;
  source: RacingCoinSource;
}

// Importe por clave, tal como vive editable en BD (TASK-322) — antes eran
// constantes en este mismo archivo. `Map` y no `Record`: el que llama ya
// tiene un `Map` a mano (viene directo de la fila de BD), y así no hace
// falta forzar un valor por defecto en cada una de las 9 claves.
export type RacingCoinRewardAmounts = ReadonlyMap<RacingCoinRewardKey, number>;

// A qué `RacingCoinSource` del ledger corresponde cada clave — varias claves
// pueden compartir fuente (los tres tramos de racha son todos WIN_STREAK en
// el ledger, aunque el importe se edite por separado).
const SOURCE_FOR_KEY: Record<RacingCoinRewardKey, RacingCoinSource> = {
  [RacingCoinRewardKey.RACE_FIRST_PLACE]: RacingCoinSource.RACE_FIRST_PLACE,
  [RacingCoinRewardKey.RACE_SECOND_PLACE]: RacingCoinSource.RACE_SECOND_PLACE,
  [RacingCoinRewardKey.RACE_THIRD_PLACE]: RacingCoinSource.RACE_THIRD_PLACE,
  [RacingCoinRewardKey.REWARDED_AD]: RacingCoinSource.REWARDED_AD,
  [RacingCoinRewardKey.PERSONAL_BEST]: RacingCoinSource.PERSONAL_BEST,
  [RacingCoinRewardKey.BEAT_FRIEND]: RacingCoinSource.BEAT_FRIEND,
  [RacingCoinRewardKey.WIN_STREAK_2]: RacingCoinSource.WIN_STREAK,
  [RacingCoinRewardKey.WIN_STREAK_3]: RacingCoinSource.WIN_STREAK,
  [RacingCoinRewardKey.WIN_STREAK_4_PLUS]: RacingCoinSource.WIN_STREAK,
};

// <= 0 (el admin lo puso a 0, o algo raro llegó negativo) = bono
// desactivado, no null-vs-0 ambiguo por toda la llamada.
function reward(
  amounts: RacingCoinRewardAmounts,
  key: RacingCoinRewardKey,
): RacingCoinReward | null {
  const amount = amounts.get(key) ?? 0;
  if (amount <= 0) return null;
  return { amount, source: SOURCE_FOR_KEY[key] };
}

// `position` es la posición EN ESA CARRERA (1 a 3, ver
// `RacingOnlineRaceParticipant`), no el puesto en el leaderboard general.
export function coinRewardForPosition(
  position: number,
  amounts: RacingCoinRewardAmounts,
): RacingCoinReward | null {
  switch (position) {
    case 1:
      return reward(amounts, RacingCoinRewardKey.RACE_FIRST_PLACE);
    case 2:
      return reward(amounts, RacingCoinRewardKey.RACE_SECOND_PLACE);
    case 3:
      return reward(amounts, RacingCoinRewardKey.RACE_THIRD_PLACE);
    default:
      return null;
  }
}

// El anuncio ACELERA la progresión, no es la única vía razonable de
// conseguir monedas (TASK-286).
export function rewardedAdCoinReward(
  amounts: RacingCoinRewardAmounts,
): RacingCoinReward | null {
  return reward(amounts, RacingCoinRewardKey.REWARDED_AD);
}

// Solo por MEJORAR tu marca anterior en un circuito, no por la primera
// vuelta que subes ahí — quien llama ya filtra eso antes de pedir esto.
export function personalBestCoinReward(
  amounts: RacingCoinRewardAmounts,
): RacingCoinReward | null {
  return reward(amounts, RacingCoinRewardKey.PERSONAL_BEST);
}

// Por ganarle a un amigo en una carrera online — un flat único por carrera,
// no uno por cada amigo vencido si hubiera más de uno entre los rivales.
export function beatFriendCoinReward(
  amounts: RacingCoinRewardAmounts,
): RacingCoinReward | null {
  return reward(amounts, RacingCoinRewardKey.BEAT_FRIEND);
}

// `streakLength` cuenta la victoria que se acaba de registrar (2 = la
// segunda seguida, incluida esta). Los tramos y su tope los decide el admin
// editando cada importe por separado — aquí solo se resuelve qué clave mirar.
export function coinRewardForWinStreak(
  streakLength: number,
  amounts: RacingCoinRewardAmounts,
): RacingCoinReward | null {
  if (streakLength < 2) return null;
  const key =
    streakLength === 2
      ? RacingCoinRewardKey.WIN_STREAK_2
      : streakLength === 3
        ? RacingCoinRewardKey.WIN_STREAK_3
        : RacingCoinRewardKey.WIN_STREAK_4_PLUS;
  return reward(amounts, key);
}
