import { Inject, Injectable } from '@nestjs/common';
import { FriendshipRequest } from '../../domain/entities/friendship.entity';
import {
  FRIENDSHIP_REPOSITORY,
  type FriendshipRepositoryPort,
} from '../ports/friendship-repository.port';

// Solicitudes PENDING que ha RECIBIDO el jugador — las que él mismo mandó y
// aún no le han respondido no aparecen aquí, son harina de otra pantalla.
@Injectable()
export class ListPendingFriendRequestsUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendships: FriendshipRepositoryPort,
  ) {}

  async execute(userId: string): Promise<FriendshipRequest[]> {
    return this.friendships.listPendingRequests(userId);
  }
}
