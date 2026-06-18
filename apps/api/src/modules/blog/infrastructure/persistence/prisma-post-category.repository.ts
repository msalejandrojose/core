import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostCategory } from '../../domain/entities/post-category.entity';
import {
  CreateCategoryData,
  ListCategoriesOptions,
  PostCategoryRepositoryPort,
  UpdateCategoryPatch,
} from '../../application/ports/post-category-repository.port';
import { PostCategoryMapper } from '../mappers/post-category.mapper';

@Injectable()
export class PrismaPostCategoryRepository implements PostCategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<PostCategory> {
    const row = await this.prisma.postCategory.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
      },
    });
    return PostCategoryMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateCategoryPatch): Promise<PostCategory> {
    const data: Prisma.PostCategoryUncheckedUpdateInput = {};
    if (patch.slug !== undefined) data.slug = patch.slug;
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.parentId !== undefined) data.parentId = patch.parentId;
    const row = await this.prisma.postCategory.update({ where: { id }, data });
    return PostCategoryMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.postCategory.delete({ where: { id } });
  }

  async findById(id: string): Promise<PostCategory | null> {
    const row = await this.prisma.postCategory.findUnique({ where: { id } });
    return row ? PostCategoryMapper.toDomain(row) : null;
  }

  async existsSlug(slug: string, exceptId?: string): Promise<boolean> {
    const count = await this.prisma.postCategory.count({
      where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  }

  async list(
    opts: ListCategoriesOptions,
  ): Promise<PaginatedResult<PostCategory>> {
    const where: Prisma.PostCategoryWhereInput = {
      ...(opts.nameContains ? { name: { contains: opts.nameContains } } : {}),
      ...(opts.parentId !== undefined ? { parentId: opts.parentId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.postCategory.findMany({
        where,
        orderBy: { name: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.postCategory.count({ where }),
    ]);
    return { items: rows.map((r) => PostCategoryMapper.toDomain(r)), total };
  }

  async listPublic(): Promise<PostCategory[]> {
    const now = new Date();
    const rows = await this.prisma.postCategory.findMany({
      where: {
        posts: {
          some: {
            OR: [
              { status: 'PUBLISHED' },
              { status: 'SCHEDULED', publishedAt: { lte: now } },
            ],
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => PostCategoryMapper.toDomain(r));
  }
}
