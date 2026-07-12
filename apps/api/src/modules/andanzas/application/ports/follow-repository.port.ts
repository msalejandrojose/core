import { CursorPage } from '../../../../shared/pagination';
import { UserRef } from '../../domain/entities/user-ref.entity';

export const FOLLOW_REPOSITORY = Symbol('FOLLOW_REPOSITORY');

export interface ListFollowsOptions {
  userId: string;
  limit: number;
  cursor?: string;
}

export interface FollowRepositoryPort {
  exists(followerId: string, followingId: string): Promise<boolean>;
  create(followerId: string, followingId: string): Promise<void>;
  delete(followerId: string, followingId: string): Promise<void>;
  // Sin paginar: el grafo social de un usuario en el MVP es pequeño (su
  // grupo de amigos), y el feed agregado necesita todos los ids de golpe
  // para el filtro `IN`.
  listFollowingIds(followerId: string): Promise<string[]>;
  listFollowing(opts: ListFollowsOptions): Promise<CursorPage<UserRef>>;
  listFollowers(opts: ListFollowsOptions): Promise<CursorPage<UserRef>>;
}
