import { Inject, Injectable } from '@nestjs/common';
import { FriendCode } from '../../domain/entities/friend-code.entity';
import {
  FRIEND_CODE_REPOSITORY,
  type FriendCodeRepositoryPort,
} from '../ports/friend-code-repository.port';

// El código propio, generándolo la primera vez que se pide (TASK-222).
@Injectable()
export class GetMyFriendCodeUseCase {
  constructor(
    @Inject(FRIEND_CODE_REPOSITORY)
    private readonly codes: FriendCodeRepositoryPort,
  ) {}

  async execute(userId: string): Promise<FriendCode> {
    return this.codes.getOrCreate(userId);
  }
}
