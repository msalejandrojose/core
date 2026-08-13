import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';

export const PLAYER_CAR_LOADOUT_REPOSITORY = Symbol(
  'RACING_PLAYER_CAR_LOADOUT_REPOSITORY',
);

export interface UpsertPlayerCarLoadoutData {
  archetypeId: string;
  tiresPartId: string | null;
  wingPartId: string | null;
  chassisPartId: string | null;
}

export interface PlayerCarLoadoutRepositoryPort {
  /** Null si el jugador nunca ha cambiado nada — el use-case resuelve el
   *  arquetipo por defecto, este port no sabe cuál es. */
  findByUserId(userId: string): Promise<PlayerCarLoadout | null>;
  upsert(
    userId: string,
    data: UpsertPlayerCarLoadoutData,
  ): Promise<PlayerCarLoadout>;
}
