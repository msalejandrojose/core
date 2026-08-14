import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../../../iam/domain/errors/user-not-found.error';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../iam/application/ports/user-repository.port';
import {
  AdminUserTrackSummary,
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  GetPlayerCarLoadoutUseCase,
  type PlayerCarLoadoutResult,
} from './get-player-car-loadout.use-case';

export interface UserRacingTrackSummary extends AdminUserTrackSummary {
  /** Null si el jugador solo tiene intentos anulados en este circuito: no
   *  hay tiempo válido que pueda tener posición. */
  position: number | null;
}

export interface UserRacingSummary {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  tracks: UserRacingTrackSummary[];
  /** Igual que `GetPlayerCarLoadoutUseCase`: se reutiliza tal cual, ya
   *  incluye `stats` combinados (arquetipo + piezas). */
  loadout: PlayerCarLoadoutResult;
}

// Ficha de racing de un jugador (TASK-251): la vista simétrica de TASK-246 —
// en vez de partir del circuito, se parte del usuario. Comparte
// LapTimeRepositoryPort con esa tarea; añade el coche equipado ahora mismo
// (TASK-268), que sí existe como entidad propia (`PlayerCarLoadout`) aunque
// la descripción original de este ticket asumiera que no.
@Injectable()
export class AdminGetUserRacingSummaryUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY)
    private readonly lapTimes: LapTimeRepositoryPort,
    private readonly getLoadout: GetPlayerCarLoadoutUseCase,
  ) {}

  async execute(userId: string): Promise<UserRacingSummary> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const [trackSummaries, loadout] = await Promise.all([
      this.lapTimes.summarizeForUserAdmin(userId),
      this.getLoadout.execute(userId),
    ]);

    const tracks = await Promise.all(
      trackSummaries.map(async (summary) => ({
        ...summary,
        position:
          summary.bestDurationMs !== null
            ? await this.lapTimes.positionOf(summary.trackId, userId)
            : null,
      })),
    );

    return {
      userId: user.id,
      userEmail: user.email,
      userDisplayName: displayNameOf(user),
      tracks,
      loadout,
    };
  }
}

function displayNameOf(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const full = [user.firstName, user.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .trim();
  return full === '' ? user.email : full;
}
