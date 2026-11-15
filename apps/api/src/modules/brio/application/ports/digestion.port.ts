import type {
  BowelAmount,
  BowelMovement,
  BristolType,
} from '../../domain/services/digestion';

export const BRIO_DIGESTION_REPOSITORY = Symbol('BRIO_DIGESTION_REPOSITORY');

export interface NewBowelMovement {
  userId: string;
  occurredAt: Date;
  loggedOn: string;
  bristolType: BristolType;
  amount: BowelAmount;
}

export interface BrioDigestionRepositoryPort {
  create(data: NewBowelMovement): Promise<BowelMovement>;
  /** Del usuario, desde `fromDay` (incluido), las más recientes primero. */
  listSince(userId: string, fromDay: string): Promise<BowelMovement[]>;
  /** Día del primer registro, o null si no tiene ninguno. */
  firstDay(userId: string): Promise<string | null>;
  /** `false` si no existía o no era del usuario. */
  delete(id: string, userId: string): Promise<boolean>;
}
