import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../iam/application/ports/user-repository.port';
import { CannotFollowSelfError } from '../../domain/errors/cannot-follow-self.error';
import { FollowTargetNotFoundError } from '../../domain/errors/follow-target-not-found.error';
import { canFollow } from '../../domain/social/follow-rules';
import {
  FOLLOW_REPOSITORY,
  type FollowRepositoryPort,
} from '../ports/follow-repository.port';
import { NOTIFIER, type NotifierPort } from '../ports/notifier.port';

export interface FollowUserInput {
  followerId: string;
  followingId: string;
}

// Idempotente: si ya se seguía, no falla ni duplica — simplemente confirma.
@Injectable()
export class FollowUserUseCase {
  private readonly logger = new Logger(FollowUserUseCase.name);

  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(NOTIFIER) private readonly notifier: NotifierPort,
  ) {}

  async execute(input: FollowUserInput): Promise<void> {
    if (!canFollow(input.followerId, input.followingId)) {
      throw new CannotFollowSelfError(input.followerId);
    }

    const target = await this.users.findById(input.followingId);
    if (!target) throw new FollowTargetNotFoundError(input.followingId);

    const already = await this.follows.exists(input.followerId, input.followingId);
    if (already) return;

    await this.follows.create(input.followerId, input.followingId);

    const follower = await this.users.findById(input.followerId);
    const followerName = follower?.firstName ?? follower?.email ?? 'Alguien';
    // Best-effort: si falla la notificación, el follow ya se ha creado — no
    // tiene sentido tumbar la petición por esto.
    try {
      await this.notifier.notify({
        userId: input.followingId,
        kind: 'andanzas.follow',
        title: `${followerName} te sigue ahora`,
        data: { followerId: input.followerId },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo notificar a ${input.followingId} del nuevo follow: ${String(err)}`,
      );
    }
  }
}
