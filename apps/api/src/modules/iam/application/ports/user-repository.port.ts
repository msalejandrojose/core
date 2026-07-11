import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CursorPage } from '../../../../shared/pagination';
import type { Filter, FindSpec } from '../../../../shared/query';
import { User, UserType } from '../../domain/entities/user.entity';

export interface ListWithCursorOptions {
  limit: number;
  cursor?: string;
}

export const USER_REPOSITORY = Symbol('IAM_USER_REPOSITORY');

/** @deprecated Usar `getRows({ filter, order, limit })` con Filter/Order/Limit. */
export interface ListUsersOptions {
  page: number;
  limit: number;
  sort?: string;
  order: 'asc' | 'desc';
  userType?: UserType;
  isActive?: boolean;
  emailContains?: string;
}

export interface UpdateUserPatch {
  firstName?: string | null;
  lastName?: string | null;
  isActive?: boolean;
}

export interface UpdateTokensPatch {
  emailVerificationToken?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: Date | null;
  isActive?: boolean;
  passwordHash?: string | null;
}

/** Vincula (o refresca) los datos de un proveedor social sobre un usuario ya existente. */
export interface LinkSocialAccountPatch {
  googleId?: string;
  facebookId?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UserRepositoryPort {
  // ── Por id / email ─────────────────────────────────────────────────────
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByFacebookId(facebookId: string): Promise<User | null>;

  // ── Mutaciones ─────────────────────────────────────────────────────────
  create(user: User): Promise<User>;
  update(id: string, patch: UpdateUserPatch): Promise<User>;
  updateTokens(id: string, patch: UpdateTokensPatch): Promise<User>;
  linkSocialAccount(id: string, patch: LinkSocialAccountPatch): Promise<User>;
  // Soft delete: marca isActive=false.
  deactivate(id: string): Promise<User>;

  // ── Query genérica con Filter / Order / Limit ──────────────────────────
  getRows(spec?: FindSpec<User>): Promise<PaginatedResult<User>>;
  getRow(spec: FindSpec<User>): Promise<User | null>;
  getCount(filter?: Filter<User>): Promise<number>;
  getDistinctValues<K extends keyof User>(
    field: K,
    filter?: Filter<User>,
  ): Promise<User[K][]>;

  // ── Paginación por cursor ──────────────────────────────────────────────
  listWithCursor(opts: ListWithCursorOptions): Promise<CursorPage<User>>;

  /** @deprecated mantener mientras migra `ListUsersUseCase` y consumidores. */
  findMany(opts: ListUsersOptions): Promise<PaginatedResult<User>>;
}
