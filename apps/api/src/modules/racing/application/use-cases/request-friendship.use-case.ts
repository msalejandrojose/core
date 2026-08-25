import { Inject, Injectable } from '@nestjs/common';
import { Friendship } from '../../domain/entities/friendship.entity';
import { FriendCodeNotFoundError } from '../../domain/errors/friend-code-not-found.error';
import { InvalidFriendshipRequestError } from '../../domain/errors/invalid-friendship-request.error';
import { validateFriendshipRequest } from '../../domain/validate-friendship-request';
import {
  FRIEND_CODE_REPOSITORY,
  type FriendCodeRepositoryPort,
} from '../ports/friend-code-repository.port';
import {
  FRIENDSHIP_REPOSITORY,
  type FriendshipRepositoryPort,
} from '../ports/friendship-repository.port';

// Pide amistad al dueño de un código (TASK-222). Recíproca, con aceptación:
// esto solo crea la solicitud PENDING, no hace amigos a nadie todavía —
// `RespondFriendshipUseCase` es quien la resuelve.
@Injectable()
export class RequestFriendshipUseCase {
  constructor(
    @Inject(FRIEND_CODE_REPOSITORY)
    private readonly codes: FriendCodeRepositoryPort,
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendships: FriendshipRepositoryPort,
  ) {}

  async execute(requesterId: string, code: string): Promise<Friendship> {
    const friendCode = await this.codes.findByCode(code);
    if (!friendCode) throw new FriendCodeNotFoundError(code);

    const addresseeId = friendCode.userId;
    const existingActive = await this.friendships.findActiveBetween(
      requesterId,
      addresseeId,
    );

    const validation = validateFriendshipRequest(
      requesterId,
      addresseeId,
      existingActive,
    );
    if (!validation.ok) {
      throw new InvalidFriendshipRequestError(validation.reason);
    }

    return this.friendships.create(requesterId, addresseeId);
  }
}
