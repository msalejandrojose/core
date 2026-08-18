import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../iam/application/ports/user-repository.port';
import { UserNotFoundError } from '../../../iam/domain/errors/user-not-found.error';
import { CarSkinNotFoundError } from '../../domain/errors/car-skin-not-found.error';
import {
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';
import {
  PLAYER_CAR_SKIN_REPOSITORY,
  type PlayerCarSkinRepositoryPort,
} from '../ports/player-car-skin-repository.port';

// Concede la propiedad de un skin a un jugador a mano desde el backoffice —
// hoy no existe ni un sistema de pagos ni uno de recompensas que lo haga
// automáticamente (ver comentario del modelo `PlayerCarSkin`).
@Injectable()
export class AdminGrantCarSkinUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
    @Inject(PLAYER_CAR_SKIN_REPOSITORY)
    private readonly ownerships: PlayerCarSkinRepositoryPort,
  ) {}

  async execute(userId: string, skinId: string): Promise<void> {
    const [user, skin] = await Promise.all([
      this.users.findById(userId),
      this.skins.findById(skinId),
    ]);
    if (!user) throw new UserNotFoundError(userId);
    if (!skin) throw new CarSkinNotFoundError(skinId);

    await this.ownerships.grant(userId, skinId);
  }
}
