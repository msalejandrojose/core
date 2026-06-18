import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { PostStatus } from '../../domain/value-objects/post-status.vo';
import {
  CreatePostData,
  ListPostsAdminOptions,
  ListPostsPublicOptions,
  PostRepositoryPort,
  UpdatePostPatch,
} from '../../application/ports/post-repository.port';
import { PostMapper, PostRowWithRelations } from '../mappers/post.mapper';

// Relaciones que se traen en cada lectura para construir el detalle sin N+1.
const POST_INCLUDE = {
  category: true,
  tags: { include: { tag: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PostInclude;

@Injectable()
export class PrismaPostRepository implements PostRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePostData): Promise<PostWithRelations> {
    const row = await this.prisma.post.create({
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        status: data.status,
        publishedAt: data.publishedAt,
        coverImageId: data.coverImageId,
        authorId: data.authorId,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        categoryId: data.categoryId,
        tags: data.tagIds.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: POST_INCLUDE,
    });
    return PostMapper.toDomain(row);
  }

  async update(id: string, patch: UpdatePostPatch): Promise<PostWithRelations> {
    const data: Prisma.PostUncheckedUpdateInput = {};
    if (patch.slug !== undefined) data.slug = patch.slug;
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.excerpt !== undefined) data.excerpt = patch.excerpt;
    if (patch.content !== undefined) data.content = patch.content;
    if (patch.coverImageId !== undefined)
      data.coverImageId = patch.coverImageId;
    if (patch.metaTitle !== undefined) data.metaTitle = patch.metaTitle;
    if (patch.metaDescription !== undefined)
      data.metaDescription = patch.metaDescription;
    if (patch.categoryId !== undefined) data.categoryId = patch.categoryId;
    // `tagIds` reemplaza el set completo de etiquetas de forma atómica.
    if (patch.tagIds !== undefined) {
      data.tags = {
        deleteMany: {},
        create: patch.tagIds.map((tagId) => ({ tagId })),
      };
    }

    const row = await this.prisma.post.update({
      where: { id },
      data,
      include: POST_INCLUDE,
    });
    return PostMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  async findById(id: string): Promise<PostWithRelations | null> {
    const row = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    return row ? PostMapper.toDomain(row) : null;
  }

  async findVisibleBySlug(slug: string): Promise<PostWithRelations | null> {
    const row = await this.prisma.post.findFirst({
      where: { slug, ...this.visibleWhere(new Date()) },
      include: POST_INCLUDE,
    });
    return row ? PostMapper.toDomain(row) : null;
  }

  async listAdmin(
    opts: ListPostsAdminOptions,
  ): Promise<CursorPage<PostWithRelations>> {
    const filters: Prisma.PostWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.authorId ? { authorId: opts.authorId } : {}),
      ...(opts.tagId ? { tags: { some: { tagId: opts.tagId } } } : {}),
      ...(opts.titleContains
        ? { title: { contains: opts.titleContains } }
        : {}),
    };

    // Cursor sobre createdAt DESC, id ASC (estable bajo inserciones).
    const where: Prisma.PostWhereInput = opts.cursor
      ? { AND: [filters, this.createdAtCursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.post.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: POST_INCLUDE,
    });

    return this.toCursorPage(rows, opts.limit, (last) =>
      CursorCodec.encode({
        id: last.id,
        createdAt: last.createdAt.toISOString(),
      }),
    );
  }

  async listPublic(
    opts: ListPostsPublicOptions,
  ): Promise<CursorPage<PostWithRelations>> {
    const filters: Prisma.PostWhereInput = {
      ...this.visibleWhere(new Date()),
      ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
      ...(opts.tagSlug
        ? { tags: { some: { tag: { slug: opts.tagSlug } } } }
        : {}),
    };

    // Cursor sobre publishedAt DESC, id ASC. El payload reutiliza el campo
    // `createdAt` del codec para transportar el `publishedAt` (es opaco).
    const where: Prisma.PostWhereInput = opts.cursor
      ? { AND: [filters, this.publishedAtCursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.post.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: POST_INCLUDE,
    });

    return this.toCursorPage(rows, opts.limit, (last) =>
      CursorCodec.encode({
        id: last.id,
        createdAt: (last.publishedAt ?? last.createdAt).toISOString(),
      }),
    );
  }

  async setStatus(
    id: string,
    status: PostStatus,
    publishedAt?: Date | null,
  ): Promise<PostWithRelations> {
    const data: Prisma.PostUncheckedUpdateInput = { status };
    if (publishedAt !== undefined) data.publishedAt = publishedAt;
    const row = await this.prisma.post.update({
      where: { id },
      data,
      include: POST_INCLUDE,
    });
    return PostMapper.toDomain(row);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async existsSlug(slug: string, exceptId?: string): Promise<boolean> {
    const count = await this.prisma.post.count({
      where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  // Visible públicamente: PUBLISHED, o SCHEDULED cuyo `publishedAt` ya venció.
  private visibleWhere(now: Date): Prisma.PostWhereInput {
    return {
      OR: [
        { status: 'PUBLISHED' },
        { status: 'SCHEDULED', publishedAt: { lte: now } },
      ],
    };
  }

  private createdAtCursorWhere(cursor: string): Prisma.PostWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, id: { gt: decoded.id } },
      ],
    };
  }

  private publishedAtCursorWhere(cursor: string): Prisma.PostWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { publishedAt: { lt: date } },
        { publishedAt: date, id: { gt: decoded.id } },
      ],
    };
  }

  private toCursorPage(
    rows: PostRowWithRelations[],
    limit: number,
    encode: (last: PostRowWithRelations) => string,
  ): CursorPage<PostWithRelations> {
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map((r) => PostMapper.toDomain(r)),
      nextCursor: last ? encode(last) : null,
    };
  }
}
