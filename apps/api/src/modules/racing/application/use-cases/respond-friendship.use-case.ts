import { Inject, Injectable } from '@nestjs/common';
import { Friendship } from '../../domain/entities/friendship.entity';
import { FriendshipNotFoundError } from '../../domain/errors/friendship-not-found.error';
import { FriendshipNotRespondableError } from '../../domain/errors/friendship-not-respondable.error';
import {
  FRIENDSHIP_REPOSITORY,
  type FriendshipRepositoryPort,
} from '../ports/friendship-repository.port';

// Acepta o rechaza una solicitud recibida (TASK-222). Solo el destinatario
// puede responder — quien la mandó no puede autoaceptarse — y solo mientras
// siga PENDING.
@Injectable()
export class RespondFriendshipUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendships: FriendshipRepositoryPort,
  ) {}

  async execute(
    userId: string,
    friendshipId: string,
    accept: boolean,
  ): Promise<Friendship> {
    const friendship = await this.friendships.findById(friendshipId);
    if (!friendship) throw new FriendshipNotFoundError(friendshipId);

    if (friendship.addresseeId !== userId) {
      throw new FriendshipNotRespondableError(
        friendshipId,
        'no eres quien tiene que responder a esta solicitud',
      );
    }
    if (friendship.status !== 'PENDING') {
      throw new FriendshipNotRespondableError(
        friendshipId,
        'ya se respondió a esta solicitud',
      );
    }

    return accept
      ? this.friendships.accept(friendshipId)
      : this.friendships.reject(friendshipId);
  }
}
