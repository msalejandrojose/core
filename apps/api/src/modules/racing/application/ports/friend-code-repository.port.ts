import { FriendCode } from '../../domain/entities/friend-code.entity';

export const FRIEND_CODE_REPOSITORY = Symbol('RACING_FRIEND_CODE_REPOSITORY');

export interface FriendCodeRepositoryPort {
  findByCode(code: string): Promise<FriendCode | null>;

  /** Devuelve el código del jugador, generándolo (con reintento ante
   *  colisión de unicidad) si es la primera vez que lo pide. La generación
   *  y el reintento son detalle de infraestructura — el dominio no sabe de
   *  eso, solo pide "mi código". */
  getOrCreate(userId: string): Promise<FriendCode>;
}
