import { Inject, Injectable } from '@nestjs/common';
import { Friend } from '../../domain/entities/friendship.entity';
import {
  FRIENDSHIP_REPOSITORY,
  type FriendshipRepositoryPort,
} from '../ports/friendship-repository.port';

@Injectable()
export class ListFriendsUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendships: FriendshipRepositoryPort,
  ) {}

  async execute(userId: string): Promise<Friend[]> {
    return this.friendships.listFriends(userId);
  }
}
