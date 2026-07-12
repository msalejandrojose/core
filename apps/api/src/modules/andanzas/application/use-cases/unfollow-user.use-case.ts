import { Inject, Injectable } from '@nestjs/common';
import {
  FOLLOW_REPOSITORY,
  type FollowRepositoryPort,
} from '../ports/follow-repository.port';

export interface UnfollowUserInput {
  followerId: string;
  followingId: string;
}

// Idempotente: si no se seguía, no falla — simplemente confirma.
@Injectable()
export class UnfollowUserUseCase {
  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepositoryPort,
  ) {}

  async execute(input: UnfollowUserInput): Promise<void> {
    await this.follows.delete(input.followerId, input.followingId);
  }
}
