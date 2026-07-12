import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Tag } from '../../domain/entities/tag.entity';
import { TagSuggestion } from '../../domain/tags/suggest-tags';
import { TagRepositoryPort } from '../../application/ports/tag-repository.port';
import { TagMapper } from '../mappers/tag.mapper';

@Injectable()
export class PrismaTagRepository implements TagRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByName(normalizedName: string): Promise<Tag> {
    const row = await this.prisma.tag.upsert({
      where: { name: normalizedName },
      create: { id: randomUUID(), name: normalizedName },
      update: {},
    });
    return TagMapper.toDomain(row);
  }

  async searchByPrefix(
    normalizedPrefix: string,
    limit: number,
  ): Promise<TagSuggestion[]> {
    const rows = await this.prisma.tag.findMany({
      where: { name: { startsWith: normalizedPrefix } },
      take: limit,
      include: { _count: { select: { sites: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      usageCount: row._count.sites,
    }));
  }
}
