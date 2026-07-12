import { Inject, Injectable } from '@nestjs/common';
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

export interface FollowUserInput {
  followerId: string;
  followingId: string;
}

// Idempotente: si ya se seguía, no falla ni duplica — simplemente confirma.
@Injectable()
export class FollowUserUseCase {
  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
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
  }
}
