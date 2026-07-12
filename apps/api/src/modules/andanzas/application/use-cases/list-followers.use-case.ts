import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { UserRef } from '../../domain/entities/user-ref.entity';
import {
  FOLLOW_REPOSITORY,
  type FollowRepositoryPort,
  ListFollowsOptions,
} from '../ports/follow-repository.port';

@Injectable()
export class ListFollowersUseCase {
  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepositoryPort,
  ) {}

  execute(opts: ListFollowsOptions): Promise<CursorPage<UserRef>> {
    return this.follows.listFollowers(opts);
  }
}
