import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Filter, type FindSpec, Limit, Order } from '../../../../shared/query';
import {
  filterToPrismaWhere,
  specToPrismaArgs,
} from '../../../../shared/query/prisma/from-spec';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { User } from '../../domain/entities/user.entity';
import {
  LinkSocialAccountPatch,
  ListUsersOptions,
  ListWithCursorOptions,
  UpdateTokensPatch,
  UpdateUserPatch,
  UserRepositoryPort,
} from '../../application/ports/user-repository.port';
import { UserMapper } from './user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { googleId } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { facebookId } });
    return row ? UserMapper.toDomain(row) : null;
  }

  // ── getRows / getRow / getCount / getDistinctValues ────────────────────

  async getRows(spec: FindSpec<User> = {}): Promise<PaginatedResult<User>> {
    const { where, orderBy, take, skip } = specToPrismaArgs(spec);
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where: where as Prisma.UserWhereInput,
        orderBy: orderBy as Prisma.UserOrderByWithRelationInput[],
        take,
        skip,
      }),
      this.prisma.user.count({ where: where as Prisma.UserWhereInput }),
    ]);
    return { items: rows.map(UserMapper.toDomain), total };
  }

  async getRow(spec: FindSpec<User>): Promise<User | null> {
    const { where, orderBy } = specToPrismaArgs(spec);
    const row = await this.prisma.user.findFirst({
      where: where as Prisma.UserWhereInput,
      orderBy: orderBy as Prisma.UserOrderByWithRelationInput[],
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async getCount(filter?: Filter<User>): Promise<number> {
    const where = filterToPrismaWhere(filter);
    return this.prisma.user.count({ where: where as Prisma.UserWhereInput });
  }

  async getDistinctValues<K extends keyof User>(
    field: K,
    filter?: Filter<User>,
  ): Promise<User[K][]> {
    const where = filterToPrismaWhere(filter);
    const rows = await this.prisma.user.findMany({
      where: where as Prisma.UserWhereInput,
      distinct: [field as Prisma.UserScalarFieldEnum],
      select: { [field as string]: true } as Prisma.UserSelect,
    });
    return rows.map((r) => (r as Record<string, unknown>)[field as string]) as User[K][];
  }

  // ── Compat shim: findMany(ListUsersOptions) ────────────────────────────
  // Cuando todos los consumidores estén migrados a getRows, se borra.

  async findMany(opts: ListUsersOptions): Promise<PaginatedResult<User>> {
    const filter = new Filter<User>();
    if (opts.userType !== undefined) filter.addEqualValue('userType', opts.userType);
    if (opts.isActive !== undefined) filter.addEqualValue('isActive', opts.isActive);
    if (opts.emailContains) filter.addLike('email', `%${opts.emailContains}%`);

    const sort = (opts.sort ?? 'createdAt') as keyof User;
    return this.getRows({
      filter,
      order: new Order<User>().add(sort, opts.order),
      limit: Limit.page(opts.page, opts.limit),
    });
  }

  // ── Paginación por cursor ──────────────────────────────────────────────
  // Ordena por createdAt DESC, id ASC para estabilidad. El cursor codifica
  // el último elemento visto; la siguiente página empieza justo después.

  async listWithCursor(opts: ListWithCursorOptions): Promise<CursorPage<User>> {
    let cursorWhere: Prisma.UserWhereInput = {};

    if (opts.cursor) {
      const decoded = CursorCodec.decode(opts.cursor); // lanza InvalidCursorError si inválido
      const cursorDate = new Date(decoded.createdAt);
      cursorWhere = {
        OR: [
          { createdAt: { lt: cursorDate } },
          { createdAt: cursorDate, id: { gt: decoded.id } },
        ],
      };
    }

    const rows = await this.prisma.user.findMany({
      where: cursorWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    const lastItem = hasMore ? items[items.length - 1] : null;
    const nextCursor = lastItem
      ? CursorCodec.encode({
          id: lastItem.id,
          createdAt: lastItem.createdAt.toISOString(),
        })
      : null;

    return { items: items.map(UserMapper.toDomain), nextCursor };
  }

  // ── Mutaciones ─────────────────────────────────────────────────────────

  async create(user: User): Promise<User> {
    const row = await this.prisma.user.create({
      data: UserMapper.toPersistenceCreate(user),
    });
    return UserMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateUserPatch): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: patch.firstName,
        lastName: patch.lastName,
        isActive: patch.isActive,
      },
    });
    return UserMapper.toDomain(row);
  }

  async updateTokens(id: string, patch: UpdateTokensPatch): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        emailVerificationToken: patch.emailVerificationToken,
        emailVerificationExpiresAt: patch.emailVerificationExpiresAt,
        passwordResetToken: patch.passwordResetToken,
        passwordResetExpiresAt: patch.passwordResetExpiresAt,
        isActive: patch.isActive,
        passwordHash: patch.passwordHash,
      },
    });
    return UserMapper.toDomain(row);
  }

  async linkSocialAccount(
    id: string,
    patch: LinkSocialAccountPatch,
  ): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        googleId: patch.googleId,
        facebookId: patch.facebookId,
        avatarUrl: patch.avatarUrl,
        firstName: patch.firstName,
        lastName: patch.lastName,
      },
    });
    return UserMapper.toDomain(row);
  }

  async deactivate(id: string): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return UserMapper.toDomain(row);
  }
}
