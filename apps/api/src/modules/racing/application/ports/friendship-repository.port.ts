import {
  Friend,
  Friendship,
  FriendshipRequest,
} from '../../domain/entities/friendship.entity';

export const FRIENDSHIP_REPOSITORY = Symbol('RACING_FRIENDSHIP_REPOSITORY');

export interface FriendshipRepositoryPort {
  findById(id: string): Promise<Friendship | null>;

  /** La solicitud PENDING o ACCEPTED entre dos jugadores, en cualquier
   *  dirección — null si no hay ninguna activa entre ellos. */
  findActiveBetween(
    userIdA: string,
    userIdB: string,
  ): Promise<Friendship | null>;

  create(requesterId: string, addresseeId: string): Promise<Friendship>;
  accept(id: string): Promise<Friendship>;
  reject(id: string): Promise<Friendship>;

  /** Amigos ACCEPTED de un jugador, con el nombre del otro ya resuelto. */
  listFriends(userId: string): Promise<Friend[]>;

  /** Solicitudes PENDING que ha RECIBIDO un jugador (no las que él mandó),
   *  con el nombre de quien la mandó ya resuelto. */
  listPendingRequests(userId: string): Promise<FriendshipRequest[]>;
}
