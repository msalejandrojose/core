import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostTag } from '../../domain/entities/post-tag.entity';
import {
  CreateTagData,
  ListTagsOptions,
  PostTagRepositoryPort,
  UpdateTagPatch,
} from '../../application/ports/post-tag-repository.port';
import { PostTagMapper } from '../mappers/post-tag.mapper';

@Injectable()
export class PrismaPostTagRepository implements PostTagRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTagData): Promise<PostTag> {
    const row = await this.prisma.postTag.create({
      data: { slug: data.slug, name: data.name },
    });
    return PostTagMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateTagPatch): Promise<PostTag> {
    const data: Prisma.PostTagUncheckedUpdateInput = {};
    if (patch.slug !== undefined) data.slug = patch.slug;
    if (patch.name !== undefined) data.name = patch.name;
    const row = await this.prisma.postTag.update({ where: { id }, data });
    return PostTagMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.postTag.delete({ where: { id } });
  }

  async findById(id: string): Promise<PostTag | null> {
    const row = await this.prisma.postTag.findUnique({ where: { id } });
    return row ? PostTagMapper.toDomain(row) : null;
  }

  async findMissingId(ids: string[]): Promise<string | null> {
    if (ids.length === 0) return null;
    const unique = [...new Set(ids)];
    const rows = await this.prisma.postTag.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    const found = new Set(rows.map((r) => r.id));
    return unique.find((id) => !found.has(id)) ?? null;
  }

  async existsSlug(slug: string, exceptId?: string): Promise<boolean> {
    const count = await this.prisma.postTag.count({
      where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  }

  async list(opts: ListTagsOptions): Promise<PaginatedResult<PostTag>> {
    const where: Prisma.PostTagWhereInput = opts.nameContains
      ? { name: { contains: opts.nameContains } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.postTag.findMany({
        where,
        orderBy: { name: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.postTag.count({ where }),
    ]);
    return { items: rows.map((r) => PostTagMapper.toDomain(r)), total };
  }

  async listPublic(): Promise<PostTag[]> {
    const now = new Date();
    const rows = await this.prisma.postTag.findMany({
      where: {
        postTags: {
          some: {
            post: {
              OR: [
                { status: 'PUBLISHED' },
                { status: 'SCHEDULED', publishedAt: { lte: now } },
              ],
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => PostTagMapper.toDomain(r));
  }
}
